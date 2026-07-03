import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertHost } from "@/lib/host-auth";
import { sendNextQuestion } from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:jeopardy-pick").
// Host sceglie quale cella della griglia Jeopardy aprire: il server riposiziona
// currentIndex sull'indice della GameQuestion scelta e invia subito la domanda.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as { gameQuestionId?: string } | null;
  const gameQuestionId = String(body?.gameQuestionId ?? "");
  if (!gameQuestionId) {
    return NextResponse.json({ error: "gameQuestionId richiesto" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { gameQuestions: { orderBy: { order: "asc" } } },
  });
  if (!game || !game.jeopardyMode) {
    return NextResponse.json({ error: "Non in modalità Jeopardy" }, { status: 400 });
  }
  if (!assertHost(req, game)) return NextResponse.json({ error: "Non autorizzato (host)" }, { status: 403 });
  const idx = game.gameQuestions.findIndex((gq) => gq.id === gameQuestionId);
  if (idx < 0) return NextResponse.json({ error: "Cella non trovata" }, { status: 404 });
  if (game.gameQuestions[idx].askedAt) {
    return NextResponse.json({ error: "Cella già consumata" }, { status: 409 });
  }

  await prisma.game.update({ where: { id: gameId }, data: { currentIndex: idx } });
  await sendNextQuestion(gameId);
  return NextResponse.json({ ok: true });
}
