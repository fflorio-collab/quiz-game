import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToGame } from "@/lib/pusher-server";
import { broadcastLobby } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.2.
// Sostituisce: socket.on("player:join").
// Crea un Player nella lobby. userId viene preso dalla session NextAuth (al posto di
// socket.data.userId), così il record è collegato all'utente autenticato.

type Body = {
  code?: string;
  nickname?: string;
  emoji?: string;
  avatarUrl?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const code = String(body?.code ?? "").toUpperCase().trim();
  const nickname = String(body?.nickname ?? "").trim();
  if (!code || !nickname) {
    return NextResponse.json({ error: "code e nickname richiesti" }, { status: 400 });
  }

  // Giocatori sempre anonimi: nessun account utente nel rebuild game-show.
  const userId = null;

  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: { select: { nickname: true } } },
  });
  if (!game) return NextResponse.json({ error: "Codice partita non valido" }, { status: 404 });
  if (game.localPartyMode) {
    return NextResponse.json(
      { error: "Questa partita è in modalità presentatore. Entra come Spettatore per seguirla." },
      { status: 400 },
    );
  }
  if (game.status !== "LOBBY") {
    return NextResponse.json({ error: "La partita è già iniziata" }, { status: 400 });
  }
  if (game.players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
    return NextResponse.json({ error: "Nickname già in uso in questa partita" }, { status: 409 });
  }

  const player = await prisma.player.create({
    data: {
      nickname,
      gameId: game.id,
      emoji: body?.emoji ?? null,
      avatarUrl: body?.avatarUrl ?? null,
      userId,
    },
  });

  await broadcastToGame(game.id, "player:joined", {
    player: {
      id: player.id,
      nickname: player.nickname,
      score: 0,
      emoji: player.emoji,
      avatarUrl: player.avatarUrl,
    },
  });
  await broadcastLobby(game.id);

  return NextResponse.json({ playerId: player.id, gameId: game.id });
}
