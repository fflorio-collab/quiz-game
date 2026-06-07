import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitLocalRoundState } from "@/lib/game-broadcasts";

// Migrazione vercel-pusher fase 7.3.
// Sostituisce: socket.on("host:local-set-turn").
// Modalità presentatore: l'host evidenzia "tocca a te" su un player.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = await req.json().catch(() => null);
  // playerId === null disabilita l'highlight (nessuno di turno)
  const rawPlayerId = body?.playerId;
  const playerId: string | null = rawPlayerId === null ? null : String(rawPlayerId || "");

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || !game.localPartyMode) {
    return NextResponse.json({ error: "Non in modalità presentatore" }, { status: 400 });
  }
  if (playerId) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.gameId !== gameId || player.eliminated) {
      return NextResponse.json({ error: "Player non valido" }, { status: 400 });
    }
  }
  await prisma.game.update({
    where: { id: gameId },
    data: { localTurnPlayerId: playerId },
  });

  // Rebroadcast dello state della domanda corrente (se attiva, recuperabile dalla GameQuestion non ancora rivelata).
  // L'API route non ha accesso alla Map in-memory currentQuestionByGame; recuperiamo dal DB
  // l'ultima GameQuestion non ancora rivelata.
  const currentGq = await prisma.gameQuestion.findFirst({
    where: { gameId, askedAt: { not: null }, revealedAt: null },
    orderBy: { order: "desc" },
  });
  if (currentGq) await emitLocalRoundState(gameId, currentGq.id);

  return NextResponse.json({ ok: true });
}
