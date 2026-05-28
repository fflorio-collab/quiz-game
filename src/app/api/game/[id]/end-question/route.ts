import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  // Trova la GameQuestion "current" — l'ultima con askedAt!=null, revealedAt==null,
  // awaitingJudgment==false. Se non c'è, no-op (potrebbe essere già stato gestito
  // da un'altra chiamata concorrente).
  const current = await prisma.gameQuestion.findFirst({
    where: { gameId, askedAt: { not: null }, revealedAt: null, awaitingJudgment: false },
    orderBy: { order: "desc" },
    include: { question: { select: { id: true, type: true } } },
  });
  if (!current) {
    return NextResponse.json({ ok: true, noop: true });
  }

  await handleQuestionEnd(gameId, current.id, current.question.id, current.question.type as QuestionType);
  return NextResponse.json({ ok: true });
}
