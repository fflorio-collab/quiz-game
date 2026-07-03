import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertHost } from "@/lib/host-auth";
import { finishGame } from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.3.
// Sostituisce: socket.on("host:finish") in server/socket-server.ts.
// Termina la partita anticipatamente (idempotente).

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { hostToken: true } });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  if (!assertHost(req, game)) return NextResponse.json({ error: "Non autorizzato (host)" }, { status: 403 });
  await finishGame(gameId);
  return NextResponse.json({ ok: true });
}
