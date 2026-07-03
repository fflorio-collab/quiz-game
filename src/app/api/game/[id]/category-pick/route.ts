import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertHost } from "@/lib/host-auth";
import { sendNextQuestion } from "@/lib/game-actions";
import { currentRoundBounds } from "@/lib/turn";

// Migrazione vercel-pusher fase 7.4.
// Sostituisce: socket.on("host:category-pick").
// Host sceglie una categoria nella griglia; il server estrae casualmente una
// delle domande rimanenti di quella categoria.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = await params;
  const body = (await req.json().catch(() => null)) as { categoryId?: string; difficulty?: string; playerId?: string } | null;
  const categoryId = String(body?.categoryId ?? "");
  // Difficoltà opzionale: se presente si pesca una domanda di quella categoria E difficoltà
  // (così l'utente sa quanti punti si gioca). Assente = qualunque difficoltà (retrocompatibile).
  const difficulty = body?.difficulty ? String(body.difficulty) : null;
  if (!categoryId) return NextResponse.json({ error: "categoryId richiesto" }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      gameQuestions: {
        include: { question: { select: { id: true, categoryId: true, difficulty: true } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!game || !game.categoryPickMode) {
    return NextResponse.json({ error: "Non in modalità \"Scegli categoria\"" }, { status: 400 });
  }
  // Autorizzazione "chi sceglie = chi risponde": consentito all'host OPPURE al
  // giocatore di turno corrente (game.localTurnPlayerId, impostato da emitCategoryGrid).
  // Un non-host senza playerId coerente col turno → 403.
  const isHost = assertHost(req, game);
  const pickerId = body?.playerId ? String(body.playerId) : "";
  if (!isHost && (!pickerId || pickerId !== game.localTurnPlayerId)) {
    return NextResponse.json({ error: "Non autorizzato (host o giocatore di turno)" }, { status: 403 });
  }
  // Limita la scelta al round corrente: così chosen.order resta nel blocco-tipo
  // del round e le modalità non si mescolano (no-op nelle partite a round singolo).
  const { lo, hi } = currentRoundBounds(game, game.gameQuestions);
  const candidates = game.gameQuestions.filter(
    (gq) => !gq.askedAt && gq.order >= lo && gq.order < hi
      && gq.question.categoryId === categoryId
      && (!difficulty || gq.question.difficulty === difficulty),
  );
  if (candidates.length === 0) {
    return NextResponse.json({ error: "Categoria esaurita" }, { status: 409 });
  }
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  // Claim atomico: solo la prima richiesta concorrente vince (awaitingCategoryPick
  // true→false in un solo update). Un doppio-tap troverebbe awaitingCategoryPick già
  // false e si ferma PRIMA di marcare una seconda domanda askedAt → niente domanda
  // "consumata ma mai mostrata", niente salto del numero. sendNextQuestion gira solo sul vincitore.
  const claimed = await prisma.game.updateMany({
    where: { id: gameId, awaitingCategoryPick: true },
    data: { currentIndex: chosen.order, awaitingCategoryPick: false },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Scelta già in corso" }, { status: 409 });
  }
  await sendNextQuestion(gameId);
  return NextResponse.json({ ok: true });
}
