import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHostRequest } from "@/lib/host-auth";
import { buildGameStateSnapshotFromDB } from "@/lib/game-snapshot";
import { broadcastToHost } from "@/lib/pusher-server";
import { broadcastLobby } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:join") (host rejoin via HTTP).
// GET = lettura pura; POST = rejoin "annunciato" (broadcast lobby e, se duello
// attivo, invia la soluzione al canale host).

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  // Host valido (token in header) → vista di regia; altrimenti vista SPETTATORE
  // anonima (forHost false: niente soluzioni/dati riservati all'host).
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { hostToken: true } });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  const forHost = isHostRequest(req, game);
  const snapshot = await buildGameStateSnapshotFromDB(gameId, undefined, { forHost });
  if (!snapshot) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  return NextResponse.json({ success: true, state: snapshot });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  // Rejoin "annunciato" dell'host → richiede token host valido.
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { hostToken: true } });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  if (!isHostRequest(req, game)) return NextResponse.json({ error: "Non autorizzato (host)" }, { status: 403 });
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
