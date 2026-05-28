import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGameStateSnapshotFromDB } from "@/lib/game-snapshot";
import { broadcastLobby } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.2.
// Sostituisce: socket.on("player:rejoin").
// Il client conserva playerId+gameId in localStorage; al refresh chiede lo snapshot.
// GET = pura lettura (no side-effect lobby), POST = rejoin "annunciato" (rebroadcast lobby).

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await params;
  const url = new URL(_req.url);
  const gameId = url.searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "gameId richiesto" }, { status: 400 });

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.gameId !== gameId) {
    return NextResponse.json({ error: "Giocatore non trovato in questa partita" }, { status: 404 });
  }
  const snapshot = await buildGameStateSnapshotFromDB(gameId, playerId);
  if (!snapshot) return NextResponse.json({ error: "Snapshot non disponibile" }, { status: 500 });
  return NextResponse.json({ success: true, state: snapshot });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await params;
  const body = (await _req.json().catch(() => null)) as { gameId?: string } | null;
  const gameId = String(body?.gameId ?? "");

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.gameId !== gameId) {
    return NextResponse.json({ error: "Giocatore non trovato in questa partita" }, { status: 404 });
  }
  const snapshot = await buildGameStateSnapshotFromDB(gameId, playerId);
  if (!snapshot) return NextResponse.json({ error: "Snapshot non disponibile" }, { status: 500 });

  await broadcastLobby(gameId);
  return NextResponse.json({ success: true, state: snapshot });
}
