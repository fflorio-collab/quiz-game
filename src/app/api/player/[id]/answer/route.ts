import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints, streakMultiplier } from "@/lib/utils";
import { QUESTION_TYPE_META } from "@/lib/questionTypes";
import { broadcastToGame } from "@/lib/pusher-server";
import { resolveTimeLimit } from "@/lib/game-snapshot";
import { resolveBasePoints, handleQuestionEnd } from "@/lib/game-actions";
import type { QuestionType } from "@/types/socket";

// Migrazione vercel-pusher fase 7.2.
// Sostituisce: socket.on("player:answer").
// Player registra una risposta sulla domanda corrente. Auto-check per i tipi
// supportati, save-for-judging per OPEN_ANSWER/IMAGE_GUESS. Se tutti i player
// attivi hanno risposto, fine domanda automatica.

type Body = {
  gameId?: string;
  answerId?: string | null;
  answerText?: string | null;
  timeTaken?: number;
  skipped?: boolean;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  const gameId = String(body?.gameId ?? "");
  const answerId = body?.answerId ?? null;
  const answerText = body?.answerText ?? null;
  const timeTaken = Number(body?.timeTaken) || 0;
  const skipped = !!body?.skipped;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { include: { answers: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.eliminated) {
    return NextResponse.json({ error: "Player non valido o eliminato" }, { status: 400 });
  }

  const currentGQ = game.gameQuestions[game.currentIndex];
  if (!currentGQ) return NextResponse.json({ error: "Nessuna domanda attiva" }, { status: 400 });

  const existing = await prisma.playerAnswer.findUnique({
    where: { playerId_gameQuestionId: { playerId, gameQuestionId: currentGQ.id } },
  });
  if (existing) return NextResponse.json({ error: "Hai già risposto" }, { status: 409 });

  const questionType = currentGQ.question.type as QuestionType;
  const effTimeLimit = resolveTimeLimit(game, currentGQ.question.timeLimit);
  let isCorrect = false;
  let points = 0;
  const meta = QUESTION_TYPE_META[questionType];

  if (skipped) {
    if (game.skipCount <= 0) return NextResponse.json({ error: "Salto non disponibile" }, { status: 400 });
    if (player.skipUsed >= game.skipCount) {
      return NextResponse.json({ error: "Hai esaurito i Salti" }, { status: 400 });
    }
    await prisma.player.update({ where: { id: playerId }, data: { skipUsed: { increment: 1 } } });
    await prisma.playerAnswer.create({
      data: {
        playerId,
        gameQuestionId: currentGQ.id,
        answerText: "[SKIP]",
        timeTaken,
        isCorrect: false,
        pointsEarned: 0,
        judged: true,
      },
    });
  } else if (meta.autoCheck) {
    const method = meta.autoCheck;
    if (method === "answerId") {
      const ans = currentGQ.question.answers.find((a) => a.id === answerId);
      isCorrect = ans?.isCorrect ?? false;
    } else if (method === "answerText") {
      const correct = currentGQ.question.answers.find((a) => a.isCorrect);
      isCorrect = !!correct && (answerText ?? "").trim().toLowerCase() === correct.text.trim().toLowerCase();
    } else if (method === "openAnswer") {
      const expected = (currentGQ.question.openAnswer ?? "").trim().toLowerCase();
      isCorrect = expected.length > 0 && (answerText ?? "").trim().toLowerCase() === expected;
    }

    const newStreak = isCorrect ? player.streak + 1 : 0;
    const newBestStreak = Math.max(player.bestStreak, newStreak);
    if (player.pendingWager > 0) {
      points = isCorrect ? player.pendingWager : -player.pendingWager;
    } else {
      const questionPoints = resolveBasePoints(game, currentGQ.question.points);
      const base = calculatePoints(timeTaken, effTimeLimit * 1000, isCorrect, questionPoints, currentGQ.question.difficulty);
      points = isCorrect ? Math.round(base * streakMultiplier(newStreak)) : 0;
    }

    await prisma.playerAnswer.create({
      data: {
        playerId,
        gameQuestionId: currentGQ.id,
        answerId: method === "answerId" ? answerId : null,
        answerText: method === "answerId" ? null : (answerText ?? ""),
        timeTaken,
        isCorrect,
        pointsEarned: points,
        judged: true,
      },
    });
    await prisma.player.update({
      where: { id: playerId },
      data: {
        score: { increment: points },
        streak: newStreak,
        bestStreak: newBestStreak,
        pendingWager: 0,
      },
    });
  } else {
    // requiresJudging=true: salva, non valutare, l'host giudica dopo
    await prisma.playerAnswer.create({
      data: {
        playerId,
        gameQuestionId: currentGQ.id,
        answerText: answerText ?? "",
        timeTaken,
        isCorrect: false,
        pointsEarned: 0,
        judged: false,
      },
    });
  }

  const isAutoChecked = meta.autoCheck !== null;
  if (!skipped) {
    if (game.lastManStanding && !isCorrect && isAutoChecked) {
      await prisma.player.update({ where: { id: playerId }, data: { eliminated: true } });
    }
    if (game.livesAllowed && !isCorrect && isAutoChecked) {
      const newWrong = player.wrongCount + 1;
      await prisma.player.update({
        where: { id: playerId },
        data: { wrongCount: newWrong, eliminated: newWrong >= game.livesAllowed },
      });
    }
  }

  await broadcastToGame(gameId, "game:answer-received", { playerId });

  // Anticipa fine round se tutti gli attivi hanno risposto
  const activePlayers = await prisma.player.count({ where: { gameId, eliminated: false } });
  const answeredCount = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGQ.id } });
  if (answeredCount >= activePlayers) {
    await handleQuestionEnd(gameId, currentGQ.id, currentGQ.question.id, questionType);
  }

  return NextResponse.json({ ok: true, isCorrect, pointsEarned: points });
}
