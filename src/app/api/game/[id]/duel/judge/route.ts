import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToGame, broadcastToHost } from "@/lib/pusher-server";
import { buildMask, renderMask } from "@/lib/duel-state";
import { loadDuelStateFromDB } from "@/lib/duel-state";
import type { DuelState } from "@/types/socket";

// Migrazione vercel-pusher fase 7.5.
// Sostituisce: socket.on("duel:judge").
// Host giudica la risposta detta a voce dal player attivo. In ogni caso il
// turno passa all'altro. Se il pool è esaurito o un player ha tempo 0, fine.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as { isCorrect?: boolean } | null;
  // isCorrect non incide sul tempo (lo sceglie l'host per UI feedback; il tempo è già
  // stato consumato durante il turno). Lo registriamo come lastResult nello state.
  const isCorrect = !!body?.isCorrect;

  const duel = await prisma.duel.findUnique({ where: { gameId } });
  if (!duel || duel.endedAt) {
    return NextResponse.json({ error: "Nessun duello attivo" }, { status: 404 });
  }

  // Accumula il tempo del player attivo dall'ultimo tick
  const now = new Date();
  const elapsed = duel.lastTickAt ? now.getTime() - duel.lastTickAt.getTime() : 0;
  let newPlayerATime = duel.playerATimeMs;
  let newPlayerBTime = duel.playerBTimeMs;
  if (!duel.paused) {
    if (duel.currentTurnPlayerId === duel.playerAId) {
      newPlayerATime = Math.max(0, newPlayerATime - elapsed);
    } else {
      newPlayerBTime = Math.max(0, newPlayerBTime - elapsed);
    }
  }

  // Se il player attivo ha esaurito il tempo → duello finito, lui perde
  const activeOutOfTime =
    (duel.currentTurnPlayerId === duel.playerAId && newPlayerATime <= 0) ||
    (duel.currentTurnPlayerId === duel.playerBId && newPlayerBTime <= 0);

  // Switcha turno
  const nextActive = duel.currentTurnPlayerId === duel.playerAId ? duel.playerBId : duel.playerAId;

  if (activeOutOfTime) {
    const winnerId = nextActive;
    const loserId = duel.currentTurnPlayerId;
    await prisma.duel.update({
      where: { gameId },
      data: {
        playerATimeMs: newPlayerATime,
        playerBTimeMs: newPlayerBTime,
        lastTickAt: now,
        endedAt: now,
        winnerId,
      },
    });
    // Recupera i nickname per il messaggio
    const [winner, loser] = await Promise.all([
      prisma.player.findUnique({ where: { id: winnerId } }),
      prisma.player.findUnique({ where: { id: loserId } }),
    ]);
    await broadcastToGame(gameId, "duel:ended", {
      winnerId,
      loserId,
      winnerNickname: winner?.nickname ?? "",
      loserNickname: loser?.nickname ?? "",
    });
    await prisma.duel.delete({ where: { gameId } });
    return NextResponse.json({ ok: true, finished: true });
  }

  // Estrai prossima domanda dal pool
  const pool: { text: string; answer: string }[] = JSON.parse(duel.poolJson);
  const next = pool.shift();

  if (!next) {
    // Pool esaurito: chi è in vantaggio di tempo vince
    const winnerId = newPlayerATime > newPlayerBTime ? duel.playerAId : duel.playerBId;
    const loserId = winnerId === duel.playerAId ? duel.playerBId : duel.playerAId;
    await prisma.duel.update({
      where: { gameId },
      data: { playerATimeMs: newPlayerATime, playerBTimeMs: newPlayerBTime, lastTickAt: now, endedAt: now, winnerId },
    });
    const [winner, loser] = await Promise.all([
      prisma.player.findUnique({ where: { id: winnerId } }),
      prisma.player.findUnique({ where: { id: loserId } }),
    ]);
    await broadcastToGame(gameId, "duel:ended", {
      winnerId,
      loserId,
      winnerNickname: winner?.nickname ?? "",
      loserNickname: loser?.nickname ?? "",
    });
    await prisma.duel.delete({ where: { gameId } });
    return NextResponse.json({ ok: true, finished: true });
  }

  const newMask = buildMask(next.answer);
  await prisma.duel.update({
    where: { gameId },
    data: {
      currentTurnPlayerId: nextActive,
      playerATimeMs: newPlayerATime,
      playerBTimeMs: newPlayerBTime,
      lastTickAt: now,
      currentQuestionText: next.text,
      currentCorrectAnswer: next.answer,
      currentPoolIndex: duel.currentPoolIndex + 1,
      poolJson: JSON.stringify(pool),
      maskJson: JSON.stringify(newMask),
    },
  });

  // Costruisci stato per broadcast (riusa loadDuelStateFromDB + aggiungi lastResult)
  const state = await loadDuelStateFromDB(gameId);
  if (state) {
    const stateWithResult: DuelState = {
      ...state,
      lastResult: {
        playerId: duel.currentTurnPlayerId,
        correct: isCorrect,
        correctAnswer: duel.currentCorrectAnswer,
      },
      question: { text: next.text, masked: renderMask(newMask), length: newMask.chars.length },
    };
    await broadcastToHost(gameId, "duel:host-info", { correctAnswer: next.answer });
    await broadcastToGame(gameId, "duel:state", stateWithResult);
  }

  return NextResponse.json({ ok: true });
}
