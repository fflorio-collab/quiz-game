import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendNextQuestion,
  emitJeopardyGrid,
  emitCategoryGrid,
  finishGame,
} from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:next").
// In Jeopardy / Scegli categoria, "Prossima" torna alla griglia invece di
// inviare automaticamente una domanda.

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  if (game.jeopardyMode) {
    const remaining = await prisma.gameQuestion.count({ where: { gameId, askedAt: null } });
    if (remaining === 0) {
      await finishGame(gameId);
    } else {
      await emitJeopardyGrid(gameId);
    }
    return NextResponse.json({ ok: true });
  }

  if (game.categoryPickMode) {
    const remaining = await prisma.gameQuestion.count({ where: { gameId, askedAt: null } });
    if (remaining === 0) {
      await finishGame(gameId);
    } else {
      await emitCategoryGrid(gameId);
    }
    return NextResponse.json({ ok: true });
  }

  await sendNextQuestion(gameId);
  return NextResponse.json({ ok: true });
}
