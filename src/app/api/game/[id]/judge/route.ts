import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/utils";
import { resolveTimeLimit } from "@/lib/game-snapshot";
import { resolveBasePoints, revealAnswer } from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:judge").
// Host giudica le risposte aperte (OPEN_ANSWER / IMAGE_GUESS): aggiorna
// PlayerAnswer.isCorrect + score, applica wager/streak/elimination, poi reveal.

type Judgment = { playerId: string; isCorrect: boolean };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as { judgments?: Judgment[] } | null;
  const judgments = Array.isArray(body?.judgments) ? body!.judgments : [];

  // Trova la GameQuestion in attesa di giudizio (atomic clear via updateMany)
  const pending = await prisma.gameQuestion.findFirst({
    where: { gameId, awaitingJudgment: true },
    select: { id: true, questionId: true },
  });
  if (!pending) return NextResponse.json({ error: "Nessun giudizio in attesa" }, { status: 404 });

  const cleared = await prisma.gameQuestion.updateMany({
    where: { id: pending.id, awaitingJudgment: true },
    data: { awaitingJudgment: false },
  });
  if (cleared.count === 0) {
    return NextResponse.json({ error: "Giudizio già processato" }, { status: 409 });
  }

  const gameQuestionId = pending.id;
  const questionId = pending.questionId;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        where: { id: gameQuestionId },
        include: { question: true },
      },
    },
  });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  const gq = game.gameQuestions[0];
  if (!gq) return NextResponse.json({ error: "Domanda non trovata" }, { status: 404 });

  const effTimeLimit = resolveTimeLimit(game, gq.question.timeLimit);

  for (const judgment of judgments) {
    const pa = await prisma.playerAnswer.findUnique({
      where: { playerId_gameQuestionId: { playerId: judgment.playerId, gameQuestionId } },
    });
    if (!pa) continue;
    const pl = await prisma.player.findUnique({ where: { id: judgment.playerId } });
    if (!pl) continue;

    const newStreak = judgment.isCorrect ? pl.streak + 1 : 0;
    const newBestStreak = Math.max(pl.bestStreak, newStreak);

    let points = 0;
    if (pl.pendingWager > 0) {
      points = judgment.isCorrect ? pl.pendingWager : -pl.pendingWager;
    } else if (judgment.isCorrect) {
      const questionPoints = resolveBasePoints(game, gq.question.points);
      points = calculatePoints(pa.timeTaken, effTimeLimit * 1000, true, questionPoints, gq.question.difficulty);
    }

    await prisma.playerAnswer.update({
      where: { id: pa.id },
      data: { isCorrect: judgment.isCorrect, pointsEarned: points, judged: true },
    });
    await prisma.player.update({
      where: { id: judgment.playerId },
      data: {
        score: { increment: points },
        streak: newStreak,
        bestStreak: newBestStreak,
        pendingWager: 0,
      },
    });

    if (game.lastManStanding && !judgment.isCorrect) {
      await prisma.player.update({
        where: { id: judgment.playerId },
        data: { eliminated: true },
      });
    }
    if (game.livesAllowed && !judgment.isCorrect) {
      const refreshed = await prisma.player.findUnique({ where: { id: judgment.playerId } });
      if (refreshed) {
        const newWrong = refreshed.wrongCount + 1;
        await prisma.player.update({
          where: { id: judgment.playerId },
          data: { wrongCount: newWrong, eliminated: newWrong >= game.livesAllowed },
        });
      }
    }
  }

  await revealAnswer(gameId, gameQuestionId);
  void questionId;
  return NextResponse.json({ ok: true });
}
