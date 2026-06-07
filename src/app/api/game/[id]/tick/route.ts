import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleQuestionEnd } from "@/lib/game-actions";
import { loadDuelStateFromDB } from "@/lib/duel-state";
import type { QuestionType } from "@/types/socket";

// Migrazione vercel-pusher fase 8.
// Endpoint di polling: il client lo chiama periodicamente per leggere i timer
// (domanda + speedrun + duello) e per innescare la fine automatica della
// domanda quando il deadline scade. Sostituisce il setInterval del socket
// server (che su Vercel serverless non può girare).
//
// Idempotente: handleQuestionEnd usa il lock revealInProgress (updateMany CAS),
// quindi chiamate concorrenti da più client convergono su un singolo trigger.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { select: { id: true, type: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game) return NextResponse.json({ error: "Partita non trovata" }, { status: 404 });

  const now = Date.now();
  let questionRemaining: number | null = null;
  let questionDeadlineExpired = false;

  if (game.currentQuestionDeadline) {
    const deadlineMs = game.currentQuestionDeadline.getTime();
    const remainingMs = deadlineMs - now;
    questionRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
    if (remainingMs <= 0) questionDeadlineExpired = true;
  }

  // Trigger automatico fine domanda se scaduto e in stato PLAYING (no judging/reveal).
  if (questionDeadlineExpired && game.status === "PLAYING") {
    const currentGq = game.gameQuestions[game.currentIndex];
    if (currentGq && !currentGq.awaitingJudgment && !currentGq.revealedAt) {
      await handleQuestionEnd(
        gameId,
        currentGq.id,
        currentGq.question.id,
        currentGq.question.type as QuestionType,
      );
      // L'evento Pusher (game:reveal o game:judge-answers) viene già emesso
      // da handleQuestionEnd → i client si aggiornano da soli.
    }
  }

  let speedrunRemaining: number | null = null;
  if (game.speedrunStartedAt && game.speedrunDuration) {
    const elapsed = (now - game.speedrunStartedAt.getTime()) / 1000;
    speedrunRemaining = Math.max(0, Math.ceil(game.speedrunDuration - elapsed));
  }

  // Duel state (timer continuo client-side); applica elapsed in lettura.
  const duel = await loadDuelStateFromDB(gameId);

  return NextResponse.json({
    ok: true,
    questionRemaining,
    speedrunRemaining,
    duel,
    status: game.status,
  });
}
