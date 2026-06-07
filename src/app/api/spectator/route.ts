import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildGameStateSnapshotFromDB } from "@/lib/game-snapshot";
import { broadcastSpectatorList } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.1.
// Sostituisce:
//   - socket.on("spectator:join")        → POST con body { code }
//   - socket.on("spectator:join-device") → POST con body { code, userId, nickname, ... }
// Distinzione: se userId è presente crea un Spectator record (con device);
// altrimenti registra come "screen pubblico" anonimo (no DB write, solo snapshot).

type Body = {
  code?: string;
  // Solo per join-device:
  userId?: string;
  nickname?: string;
  emoji?: string;
  avatarUrl?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const code = String(body?.code ?? "").toUpperCase().trim();
  if (!code) return NextResponse.json({ error: "Codice mancante" }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { code } });
  if (!game) return NextResponse.json({ error: "Codice partita non valido" }, { status: 404 });

  // Variante "device": l'utente registrato si iscrive come spettatore con possibilità di
  // mandare reazioni emoji. Richiede userId (utenti anonimi non possono).
  if (body?.userId) {
    const nickname = String(body.nickname ?? "").trim().slice(0, 20);
    if (!nickname) return NextResponse.json({ error: "Nickname richiesto" }, { status: 400 });
    const spectator = await prisma.spectator.upsert({
      where: { gameId_userId: { gameId: game.id, userId: body.userId } },
      create: {
        gameId: game.id,
        userId: body.userId,
        nickname,
        emoji: body.emoji ?? null,
        avatarUrl: body.avatarUrl ?? null,
      },
      update: { nickname, emoji: body.emoji ?? null, avatarUrl: body.avatarUrl ?? null },
    });
    const snapshot = await buildGameStateSnapshotFromDB(game.id);
    if (!snapshot) return NextResponse.json({ error: "Snapshot non disponibile" }, { status: 500 });
    await broadcastSpectatorList(game.id);
    return NextResponse.json({
      success: true,
      gameId: game.id,
      spectatorId: spectator.id,
      state: snapshot,
    });
  }

  // Variante "screen pubblico" — solo snapshot, nessun record persistito.
  const snapshot = await buildGameStateSnapshotFromDB(game.id);
  if (!snapshot) return NextResponse.json({ error: "Snapshot non disponibile" }, { status: 500 });
  return NextResponse.json({ success: true, gameId: game.id, state: snapshot });
}
