import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPusherConfigured, broadcastToGame } from "@/lib/pusher-server";

// POC migration vercel-pusher (fase 6/7): l'handler Socket.io
// `spectator:reaction-send` di server/socket-server.ts (line 1341) viene riscritto
// qui come endpoint HTTP. Rate-limit ora server-authoritative via DB
// (Spectator.lastReactionAt) con updateMany atomico, indipendente da memoria worker.
//
// Quando tutti i client saranno migrati a fetch+Pusher (fase 7), il vecchio
// handler in socket-server.ts può essere rimosso.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isPusherConfigured()) {
    return NextResponse.json(
      { error: "Pusher non configurato: mancano PUSHER_APP_ID/PUSHER_KEY/PUSHER_SECRET nelle env" },
      { status: 500 },
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const emoji = String(body?.emoji ?? "").slice(0, 8);
  if (!emoji) {
    return NextResponse.json({ error: "emoji richiesto" }, { status: 400 });
  }

  const spectator = await prisma.spectator.findUnique({ where: { id } });
  if (!spectator) {
    return NextResponse.json({ error: "Spettatore non trovato" }, { status: 404 });
  }

  // Rate-limit atomico server-side: solo chi vince updateMany passa.
  // Niente Map<spectatorId, lastTs> in memoria (vedi server/socket-server.ts:1297) →
  // funziona con N worker e sopravvive a restart.
  const now = new Date();
  const cutoff = new Date(now.getTime() - 1000);
  const acquired = await prisma.spectator.updateMany({
    where: {
      id,
      OR: [{ lastReactionAt: null }, { lastReactionAt: { lt: cutoff } }],
    },
    data: { lastReactionAt: now },
  });
  if (acquired.count === 0) {
    return NextResponse.json({ error: "Troppo veloce, max 1 reazione/sec" }, { status: 429 });
  }

  await broadcastToGame(spectator.gameId, "spectator:reaction", {
    spectatorId: id,
    nickname: spectator.nickname,
    emoji,
    ts: now.getTime(),
  });

  return NextResponse.json({ ok: true });
}
