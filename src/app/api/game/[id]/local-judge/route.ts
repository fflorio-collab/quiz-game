import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints, streakMultiplier } from "@/lib/utils";
import { resolveBasePoints } from "@/lib/game-actions";
import { resolveTurnConfig } from "@/lib/turn";
import { emitLocalRoundState, broadcastLeaderboard } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.3.
// Sostituisce: socket.on("host:local-judge").
// Modalità presentatore: host giudica la risposta detta a voce da un player
// sulla domanda corrente. Idempotente: il host può rigiudicare cambiando esito.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as { playerId?: string; isCorrect?: boolean } | null;
  const playerId = String(body?.playerId ?? "");
  const isCorrect = !!body?.isCorrect;
  if (!playerId) return NextResponse.json({ error: "playerId richiesto" }, { status: 400 });

  // GameQuestion attuale: latest con askedAt!=null, revealedAt==null (anche awaitingJudgment
  // può essere true; in presentatore il flusso è diverso)
  const current = await prisma.gameQuestion.findFirst({
    where: { gameId, askedAt: { not: null }, revealedAt: null },
    orderBy: { order: "desc" },
    include: { question: true },
  });
  if (!current) return NextResponse.json({ error: "Nessuna domanda attiva" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || !game.localPartyMode || game.status !== "PLAYING") {
    return NextResponse.json({ error: "Non in modalità presentatore o partita non attiva" }, { status: 400 });
  }
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.gameId !== gameId || player.eliminated) {
    return NextResponse.json({ error: "Player non valido" }, { status: 400 });
  }

  const newStreak = isCorrect ? player.streak + 1 : 0;
  const newBestStreak = Math.max(player.bestStreak, newStreak);

  let points = 0;
  if (isCorrect) {
    const questionPoints = resolveBasePoints(game, current.question.points);
    const base = calculatePoints(0, 0, true, questionPoints, current.question.difficulty);
    points = Math.round(base * streakMultiplier(newStreak));
  }

  const existing = await prisma.playerAnswer.findUnique({
    where: { playerId_gameQuestionId: { playerId, gameQuestionId: current.id } },
  });
  if (existing) {
    await prisma.player.update({
      where: { id: playerId },
      data: { score: { decrement: existing.pointsEarned } },
    });
    await prisma.playerAnswer.update({
      where: { id: existing.id },
      data: { isCorrect, pointsEarned: points, judged: true },
    });
  } else {
    await prisma.playerAnswer.create({
      data: {
        playerId,
        gameQuestionId: current.id,
        timeTaken: 0,
        isCorrect,
        pointsEarned: points,
        judged: true,
      },
    });
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      score: { increment: points },
      streak: newStreak,
      bestStreak: newBestStreak,
    },
  });

  if (game.lastManStanding && !isCorrect) {
    await prisma.player.update({ where: { id: playerId }, data: { eliminated: true } });
  }
  if (game.livesAllowed && !isCorrect && !existing) {
    const newWrong = player.wrongCount + 1;
    await prisma.player.update({
      where: { id: playerId },
      data: { wrongCount: newWrong, eliminated: newWrong >= game.livesAllowed },
    });
  }

  // Auto-advance del turno SOLO in "Tutti contro tutti": sulla stessa domanda l'host
  // gira fra tutti i giocatori (giudicato l'attivo, passa al prossimo non ancora
  // giudicato). In modalità a turni risponde UNA sola persona per domanda: la
  // rotazione avanza fra una domanda e l'altra (sendNextQuestion), non qui.
  if (!resolveTurnConfig(game).turnBased) {
    const turnGame = await prisma.game.findUnique({
      where: { id: gameId },
      select: { localTurnPlayerId: true },
    });
    if (turnGame?.localTurnPlayerId === playerId) {
      const candidates = await prisma.player.findMany({
        where: { gameId, eliminated: false },
        orderBy: { joinedAt: "asc" },
      });
      const judged = await prisma.playerAnswer.findMany({
        where: { gameQuestionId: current.id },
      });
      const judgedIds = new Set(judged.map((a) => a.playerId));
      const next = candidates.find((p) => !judgedIds.has(p.id));
      await prisma.game.update({
        where: { id: gameId },
        data: { localTurnPlayerId: next?.id ?? null },
      });
    }
  }

  await emitLocalRoundState(gameId, current.id);
  await broadcastLeaderboard(gameId);

  return NextResponse.json({ ok: true });
}
