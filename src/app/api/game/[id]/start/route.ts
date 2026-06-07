import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToGame } from "@/lib/pusher-server";
import {
  sendNextQuestion,
  emitJeopardyGrid,
  emitCategoryGrid,
  startSpeedrunStateDb,
} from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:start").
// Differenza vs Socket.io: niente setTimeout 2s prima della prima domanda
// (in API route non c'è event loop persistente). UX accettabile: il client
// può fare lui un delay di 2s dopo aver ricevuto lobby:started se serve.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: true },
  });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  if (game.players.length === 0) {
    return NextResponse.json({ error: "Servono almeno 1 giocatore per iniziare" }, { status: 400 });
  }

  let turnOrderToSet: string | null = null;
  if (!game.turnOrder || game.turnOrder.length === 0) {
    turnOrderToSet = shuffle(game.players.map((p) => p.id)).join(",");
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "PLAYING",
      startedAt: new Date(),
      currentIndex: 0,
      ...(turnOrderToSet ? { turnOrder: turnOrderToSet } : {}),
    },
  });
  await broadcastToGame(gameId, "lobby:started", {});

  if (game.speedrunDuration && game.speedrunDuration > 0) {
    await startSpeedrunStateDb(gameId);
  }

  if (game.jeopardyMode) await emitJeopardyGrid(gameId);
  else if (game.categoryPickMode) await emitCategoryGrid(gameId);
  else await sendNextQuestion(gameId);

  return NextResponse.json({ ok: true });
}
