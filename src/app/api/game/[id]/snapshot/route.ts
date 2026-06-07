import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGameStateSnapshotFromDB } from "@/lib/game-snapshot";
import { broadcastToHost } from "@/lib/pusher-server";
import { broadcastLobby } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:join") (host rejoin via HTTP).
// GET = lettura pura; POST = rejoin "annunciato" (broadcast lobby e, se duello
// attivo, invia la soluzione al canale host).

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const snapshot = await buildGameStateSnapshotFromDB(gameId, undefined, { forHost: true });
  if (!snapshot) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  return NextResponse.json({ success: true, state: snapshot });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const snapshot = await buildGameStateSnapshotFromDB(gameId, undefined, { forHost: true });
  if (!snapshot) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  await broadcastLobby(gameId);

  // Se c'è un duello attivo, manda la soluzione al canale host (per consentire il giudizio)
  const duel = await prisma.duel.findUnique({ where: { gameId } });
  if (duel && !duel.endedAt && duel.currentCorrectAnswer) {
    await broadcastToHost(gameId, "duel:host-info", { correctAnswer: duel.currentCorrectAnswer });
  }

  return NextResponse.json({ success: true, state: snapshot });
}
