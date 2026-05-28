import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToGame } from "@/lib/pusher-server";

// Migrazione vercel-pusher fase 7.5.
// Sostituisce: socket.on("duel:stop") in server/socket-server.ts.
// Termina manualmente il duello (raro — niente winner determinato).

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  const duel = await prisma.duel.findUnique({ where: { gameId } });
  if (!duel) {
    return NextResponse.json({ error: "Nessun duello attivo" }, { status: 404 });
  }

  // Marca finito e cancella la riga: i client riceveranno duel:state con finished:true.
  await prisma.duel.update({
    where: { gameId },
    data: { endedAt: new Date() },
  });

  await broadcastToGame(gameId, "duel:state", {
    playerA: { id: duel.playerAId, nickname: "", emoji: null, avatarUrl: null, timeLeftMs: duel.playerATimeMs },
    playerB: { id: duel.playerBId, nickname: "", emoji: null, avatarUrl: null, timeLeftMs: duel.playerBTimeMs },
    activePlayerId: duel.currentTurnPlayerId,
    question: null,
    turnSeq: 0,
    durationSec: duel.durationSec,
    finished: true,
    paused: duel.paused,
  });

  await prisma.duel.delete({ where: { gameId } });

  return NextResponse.json({ ok: true });
}
