import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Migrazione vercel-pusher fase 7.2.
// Sostituisce: socket.on("player:wager") in server/socket-server.ts.
// Self-contained: solo DB update + response. Nessun broadcast.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await params;
  const body = await req.json().catch(() => null);
  const gameId = String(body?.gameId ?? "");
  const amount = Number(body?.amount);

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.gameId !== gameId) {
    return NextResponse.json({ error: "Giocatore non valido" }, { status: 404 });
  }
  const safe = Math.max(0, Math.min(player.score, Math.floor(Number.isFinite(amount) ? amount : 0)));
  await prisma.player.update({ where: { id: playerId }, data: { pendingWager: safe } });
  return NextResponse.json({ ok: true, wager: safe });
}
