import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Migrazione vercel-pusher fase 7.2.
// Sostituisce: socket.on("player:fifty-fifty") in server/socket-server.ts.
// Server filtra a sorte 2 risposte sbagliate (lascia corretta + 1 errata),
// incrementa fiftyFiftyUsed e ritorna gli id da nascondere al client.

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await params;
  const body = await req.json().catch(() => null);
  const gameId = String(body?.gameId ?? "");
  const gameQuestionId = String(body?.gameQuestionId ?? "");

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.gameId !== gameId) {
    return NextResponse.json({ error: "Giocatore non valido" }, { status: 404 });
  }
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.fiftyFiftyCount <= 0) {
    return NextResponse.json({ error: "50/50 non abilitato in questa partita" }, { status: 400 });
  }
  if (player.fiftyFiftyUsed >= game.fiftyFiftyCount) {
    return NextResponse.json({ error: "Hai esaurito gli aiuti 50/50" }, { status: 400 });
  }

  const gq = await prisma.gameQuestion.findUnique({
    where: { id: gameQuestionId },
    include: { question: { include: { answers: true } } },
  });
  if (!gq || gq.question.type !== "MULTIPLE_CHOICE") {
    return NextResponse.json({ error: "50/50 disponibile solo per risposta multipla" }, { status: 400 });
  }

  const wrong = gq.question.answers.filter((a) => !a.isCorrect);
  const hideIds = shuffle(wrong).slice(0, 2).map((a) => a.id);

  await prisma.player.update({
    where: { id: playerId },
    data: { fiftyFiftyUsed: { increment: 1 } },
  });
  return NextResponse.json({ hideIds });
}
