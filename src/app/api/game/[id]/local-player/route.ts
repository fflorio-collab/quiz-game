import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastLobby } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.3.
// Sostituisce: socket.on("host:local-add-player").
// Crea un Player nel localPartyMode (presentatore) prima dell'avvio partita.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = await req.json().catch(() => null);
  const nickname = String(body?.nickname ?? "").trim();
  const emoji = body?.emoji ? String(body.emoji) : null;

  if (!nickname) {
    return NextResponse.json({ error: "Nickname vuoto" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { select: { nickname: true } } },
  });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  if (!game.localPartyMode) {
    return NextResponse.json({ error: "Non in modalità presentatore" }, { status: 400 });
  }
  if (game.status !== "LOBBY") {
    return NextResponse.json({ error: "Puoi aggiungere giocatori solo prima dell'avvio" }, { status: 400 });
  }
  if (game.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
    return NextResponse.json({ error: "Nickname già in uso in questa partita" }, { status: 409 });
  }

  const player = await prisma.player.create({
    data: { nickname, gameId, emoji },
  });
  await broadcastLobby(gameId);
  return NextResponse.json({ ok: true, playerId: player.id });
}
