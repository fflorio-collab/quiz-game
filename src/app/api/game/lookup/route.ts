import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/game/lookup?code=XXXXXX
// Risolve un codice partita nel suo gameId + stato. Usato dall'ingresso
// spettatore e per il prefill del player dal QR. Pubblico, sola lettura.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") ?? "").toUpperCase().trim();
  if (!code) {
    return NextResponse.json({ error: "code richiesto" }, { status: 400 });
  }
  const game = await prisma.game.findUnique({
    where: { code },
    select: { id: true, status: true },
  });
  if (!game) {
    return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });
  }
  return NextResponse.json({ gameId: game.id, status: game.status });
}
