import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleTurnDeadline } from "@/lib/game-actions";

// Migrazione vercel-pusher fase 8.
// Endpoint di polling: il client lo chiama periodicamente per leggere i timer
// (domanda + speedrun + duello) e per innescare la fine automatica della
// domanda quando il deadline scade. Sostituisce il setInterval del socket
// server (che su Vercel serverless non può girare).
//
// Idempotente: handleTurnDeadline usa lock/CAS interni (revealInProgress per la
// fine domanda, CAS sulla deadline per la staffetta a turni), quindi chiamate
// concorrenti da più client convergono su un singolo trigger.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
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
  // handleTurnDeadline è consapevole della modalità a turni: in Model B il timeout
  // passa al giocatore successivo invece di chiudere la domanda. Negli altri casi
  // chiude come prima. Idempotente (lock/CAS interni) → safe tra tick concorrenti.
  if (questionDeadlineExpired && game.status === "PLAYING") {
    await handleTurnDeadline(gameId);
    // L'evento Pusher (game:reveal / game:judge-answers / game:turn) viene già
    // emesso dalla funzione → i client si aggiornano da soli.
  }

  let speedrunRemaining: number | null = null;
  if (game.speedrunStartedAt && game.speedrunDuration) {
    const elapsed = (now - game.speedrunStartedAt.getTime()) / 1000;
    speedrunRemaining = Math.max(0, Math.ceil(game.speedrunDuration - elapsed));
  }

  return NextResponse.json({
    ok: true,
    questionRemaining,
    speedrunRemaining,
    status: game.status,
  });
}
