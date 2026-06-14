import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/utils";
import { QUESTION_TYPE_META } from "@/lib/questionTypes";
import { broadcastToGame } from "@/lib/pusher-server";
import { resolveTimeLimit } from "@/lib/game-snapshot";
import { resolveBasePoints, handleQuestionEnd, passTurn } from "@/lib/game-actions";
import { resolveTurnConfig, parseActiveTurnOrder, turnPlayerId, questionSeq } from "@/lib/turn";
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

  // Modalità a turni: solo il giocatore di turno può rispondere. Gli altri sono
  // bloccati lato server (oltre che in UI). activeOrder/attemptsBefore vengono
  // riusati sotto per decidere la fine domanda.
  const turnCfg = resolveTurnConfig(game);
  let activeOrder: string[] = [];
  let attemptsBefore = 0;
  let seq = 0;
  if (turnCfg.turnBased) {
    const turnPlayers = await prisma.player.findMany({
      where: { gameId },
      orderBy: { joinedAt: "asc" },
      select: { id: true, eliminated: true, joinedAt: true },
    });
    activeOrder = parseActiveTurnOrder(game.turnOrder, turnPlayers);
    attemptsBefore = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGQ.id } });
    // Rotazione sul numero di domande estratte (robusta a currentIndex che salta).
    seq = questionSeq(game.gameQuestions.filter((g) => g.askedAt).length);
    const turnId = turnPlayerId(activeOrder, seq, attemptsBefore);
    if (turnId && turnId !== playerId) {
      return NextResponse.json({ error: "Non è il tuo turno" }, { status: 403 });
    }
  }

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
      points = calculatePoints(timeTaken, effTimeLimit * 1000, isCorrect, questionPoints, currentGQ.question.difficulty);
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

  if (turnCfg.turnBased) {
    // Model B (passOnWrong) attivo solo per i tipi auto-verificati: serve sapere
    // subito se è corretta per decidere se passare. Per i tipi a giudizio host
    // ricade sul Model A (un rispondente per domanda, poi giudizio).
    const relay = turnCfg.passOnWrong && meta.autoCheck !== null;
    if (!relay || isCorrect) {
      // Model A, oppure Model B con risposta esatta → chiudi la domanda.
      await handleQuestionEnd(gameId, currentGQ.id, currentGQ.question.id, questionType);
    } else {
      // Model B sbagliata: passa la stessa domanda al successivo, o chiudi se
      // hanno già provato tutti i giocatori attivi.
      const attemptsNow = attemptsBefore + 1;
      if (attemptsNow >= activeOrder.length) {
        await handleQuestionEnd(gameId, currentGQ.id, currentGQ.question.id, questionType);
      } else {
        await passTurn(gameId, currentGQ, game, activeOrder, attemptsNow, seq);
      }
    }
  } else {
    // FREE_FOR_ALL: anticipa fine round se tutti gli attivi hanno risposto.
    const activePlayers = await prisma.player.count({ where: { gameId, eliminated: false } });
    const answeredCount = await prisma.playerAnswer.count({ where: { gameQuestionId: currentGQ.id } });
    if (answeredCount >= activePlayers) {
      await handleQuestionEnd(gameId, currentGQ.id, currentGQ.question.id, questionType);
    }
  }

  return NextResponse.json({ ok: true, isCorrect, pointsEarned: points });
}
