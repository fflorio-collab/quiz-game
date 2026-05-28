import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToGame, broadcastToHost } from "@/lib/pusher-server";
import { buildMask, renderMask } from "@/lib/duel-state";
import type { DuelState } from "@/types/socket";

// Migrazione vercel-pusher fase 7.5.
// Sostituisce: socket.on("duel:start").
// Crea un duello 1v1 (100 Secondi). Niente tick 250ms server-side: il client
// fa polling locale + (fase 8) chiama un endpoint quando il tempo del player
// attivo scade.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Body = {
  playerAId?: string;
  playerBId?: string;
  durationSec?: number;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as Body | null;
  const playerAId = String(body?.playerAId ?? "");
  const playerBId = String(body?.playerBId ?? "");
  const durationSecInput = Number(body?.durationSec ?? 100);

  if (!playerAId || !playerBId || playerAId === playerBId) {
    return NextResponse.json({ error: "Seleziona due sfidanti diversi" }, { status: 400 });
  }

  const existing = await prisma.duel.findUnique({ where: { gameId } });
  if (existing && !existing.endedAt) {
    return NextResponse.json({ error: "Duello già in corso" }, { status: 409 });
  }
  if (existing?.endedAt) {
    await prisma.duel.delete({ where: { gameId } });
  }

  const [pa, pb] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerAId } }),
    prisma.player.findUnique({ where: { id: playerBId } }),
  ]);
  if (!pa || !pb || pa.gameId !== gameId || pb.gameId !== gameId) {
    return NextResponse.json({ error: "Sfidanti non validi" }, { status: 400 });
  }

  // Pool domande: GHIGLIOTTINA o OPEN_ANSWER con openAnswer popolato
  const raw = await prisma.question.findMany({
    where: {
      OR: [
        { type: "GHIGLIOTTINA", openAnswer: { not: null } },
        { type: "OPEN_ANSWER", openAnswer: { not: null } },
      ],
    },
    take: 200,
  });
  if (raw.length === 0) {
    return NextResponse.json({ error: "Nessuna domanda disponibile per il duello" }, { status: 400 });
  }
  const pool = shuffle(raw)
    .map((q) => ({ text: q.text, answer: q.openAnswer ?? "" }))
    .filter((q) => q.answer.length > 0);
  if (pool.length < 2) {
    return NextResponse.json({ error: "Pool domande insufficiente" }, { status: 400 });
  }

  const durationSec = Math.max(10, Math.min(600, Math.floor(durationSecInput)));

  // Prima domanda: estrai e costruisci la mask
  const first = pool.shift()!;
  const firstMask = buildMask(first.answer);
  const now = new Date();

  await prisma.duel.create({
    data: {
      gameId,
      playerAId: pa.id,
      playerBId: pb.id,
      currentTurnPlayerId: pa.id,
      durationSec,
      playerATimeMs: durationSec * 1000,
      playerBTimeMs: durationSec * 1000,
      lastTickAt: now,
      paused: false,
      currentQuestionText: first.text,
      currentCorrectAnswer: first.answer,
      currentPoolIndex: 0,
      poolJson: JSON.stringify(pool),
      maskJson: JSON.stringify(firstMask),
    },
  });

  const state: DuelState = {
    playerA: { id: pa.id, nickname: pa.nickname, emoji: pa.emoji, avatarUrl: pa.avatarUrl, timeLeftMs: durationSec * 1000 },
    playerB: { id: pb.id, nickname: pb.nickname, emoji: pb.emoji, avatarUrl: pb.avatarUrl, timeLeftMs: durationSec * 1000 },
    activePlayerId: pa.id,
    question: { text: first.text, masked: renderMask(firstMask), length: firstMask.chars.length },
    turnSeq: 0,
    durationSec,
    finished: false,
    paused: false,
  };

  await broadcastToHost(gameId, "duel:host-info", { correctAnswer: first.answer });
  await broadcastToGame(gameId, "duel:state", state);

  return NextResponse.json({ ok: true });
}
