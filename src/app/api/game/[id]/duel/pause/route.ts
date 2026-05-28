import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastToGame } from "@/lib/pusher-server";
import { loadDuelStateFromDB } from "@/lib/duel-state";

// Migrazione vercel-pusher fase 7.5.
// Sostituisce: socket.on("duel:pause") in server/socket-server.ts.
// Mette in pausa / riprende il duello attivo. Il client che riceve duel:state
// si accorge che paused è cambiato e ferma/riprende il countdown locale.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = await req.json().catch(() => null);
  const wantPaused = !!body?.paused;

  const duel = await prisma.duel.findUnique({ where: { gameId } });
  if (!duel || duel.endedAt) {
    return NextResponse.json({ error: "Nessun duello attivo" }, { status: 404 });
  }
  if (duel.paused === wantPaused) {
    // No-op: già nello stato richiesto
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  let data: { paused: boolean; playerATimeMs?: number; playerBTimeMs?: number; lastTickAt: Date };

  if (wantPaused) {
    // Congelo: accumula il tempo del player attivo dall'ultimo tick a ora.
    const elapsed = duel.lastTickAt ? now.getTime() - duel.lastTickAt.getTime() : 0;
    if (duel.currentTurnPlayerId === duel.playerAId) {
      data = {
        paused: true,
        playerATimeMs: Math.max(0, duel.playerATimeMs - elapsed),
        lastTickAt: now,
      };
    } else {
      data = {
        paused: true,
        playerBTimeMs: Math.max(0, duel.playerBTimeMs - elapsed),
        lastTickAt: now,
      };
    }
  } else {
    // Ripartenza: reset baseline tick (la rivelazione lettere dovrà ripartire client-side in fase 8).
    data = { paused: false, lastTickAt: now };
  }

  await prisma.duel.update({ where: { gameId }, data });

  const state = await loadDuelStateFromDB(gameId);
  if (state) await broadcastToGame(gameId, "duel:state", state);

  return NextResponse.json({ ok: true });
}
