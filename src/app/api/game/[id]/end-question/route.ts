import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertHost } from "@/lib/host-auth";
import { handleQuestionEnd } from "@/lib/game-actions";
import type { QuestionType } from "@/types/socket";

// Migrazione vercel-pusher fase 7.3 + fase 8 (polling client).
// Sostituisce: socket.on("host:endQuestion") + l'autocall del setInterval
// quando il countdown scendeva a 0 in server/socket-server.ts.
//
// Chiamato sia dall'host (bottone "Termina domanda" per modalità senza limite)
// sia dal CLIENT quando il polling locale rileva deadline scaduta.
// handleQuestionEnd è atomico (revealInProgress lock) → safe contro multiple
// chiamate concorrenti.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  // La domanda "current" è quella con order === currentIndex (ciò che il player vede),
  // NON la più alta tra le estratte-non-rivelate: in "Scegli categoria"/Jeopardy
  // currentIndex salta e order-desc rivelerebbe un'altra domanda (risposta sbagliata).
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { currentIndex: true, hostToken: true },
  });
  if (!game) {
    return NextResponse.json({ ok: true, noop: true });
  }
  if (!assertHost(req, game)) return NextResponse.json({ error: "Non autorizzato (host)" }, { status: 403 });
  const current = await prisma.gameQuestion.findFirst({
    where: { gameId, order: game.currentIndex, askedAt: { not: null }, revealedAt: null, awaitingJudgment: false },
    include: { question: { select: { id: true, type: true } } },
  });
  if (!current) {
    return NextResponse.json({ ok: true, noop: true });
  }

  await handleQuestionEnd(gameId, current.id, current.question.id, current.question.type as QuestionType);
  return NextResponse.json({ ok: true });
}
