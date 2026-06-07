import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNextQuestion } from "@/lib/game-actions";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:category-pick").
// Host sceglie una categoria nella griglia; il server estrae casualmente una
// delle domande rimanenti di quella categoria.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as { categoryId?: string } | null;
  const categoryId = String(body?.categoryId ?? "");
  if (!categoryId) return NextResponse.json({ error: "categoryId richiesto" }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { select: { id: true, categoryId: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game || !game.categoryPickMode) {
    return NextResponse.json({ error: "Non in modalità \"Scegli categoria\"" }, { status: 400 });
  }
  const candidates = game.gameQuestions.filter(
    (gq) => !gq.askedAt && gq.question.categoryId === categoryId,
  );
  if (candidates.length === 0) {
    return NextResponse.json({ error: "Categoria esaurita" }, { status: 409 });
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  await prisma.game.update({
    where: { id: gameId },
    data: { currentIndex: chosen.order, awaitingCategoryPick: false },
  });
  await sendNextQuestion(gameId);
  return NextResponse.json({ ok: true });
}
