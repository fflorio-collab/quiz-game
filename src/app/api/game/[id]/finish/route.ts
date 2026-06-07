import { NextResponse } from "next/server";
import { finishGame } from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.3.
// Sostituisce: socket.on("host:finish") in server/socket-server.ts.
// Termina la partita anticipatamente (idempotente).

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  await finishGame(gameId);
  return NextResponse.json({ ok: true });
}
