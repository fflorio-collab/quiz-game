import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLobby } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.3.
// Sostituisce: socket.on("host:local-remove-player").
// Rimuove un Player dal localPartyMode (presentatore) prima dell'avvio partita.

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; playerId: string }> },
) {
  const { id: gameId, playerId } = await params;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || !game.localPartyMode || game.status !== "LOBBY") {
    return NextResponse.json({ error: "Non rimovibile in questo stato" }, { status: 400 });
  }
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.gameId !== gameId) {
    return NextResponse.json({ error: "Player non valido" }, { status: 404 });
  }
  await prisma.player.delete({ where: { id: playerId } });
  await broadcastLobby(gameId);
  return NextResponse.json({ ok: true });
}
