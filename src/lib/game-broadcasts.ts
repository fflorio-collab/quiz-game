import { prisma } from "@/lib/prisma";
import { broadcastToGame, broadcastToHost } from "@/lib/pusher-server";
import { resolveBasePoints } from "@/lib/scoring";

// Helper di broadcast riusabili dalle API routes Next.js (migration vercel-pusher fase 7).
// Replicano (con Pusher al posto di io.emit) le funzioni omonime di server/socket-server.ts
// — duplicazione temporanea: socket-server.ts viene rimosso al cutover (fase 10).

export async function broadcastLobby(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { joinedAt: "asc" } } },
  });
  if (!game) return;
  await broadcastToGame(gameId, "lobby:updated", {
    players: game.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      emoji: p.emoji,
      avatarUrl: p.avatarUrl,
      eliminated: p.eliminated,
      wrongCount: p.wrongCount,
      fiftyFiftyUsed: p.fiftyFiftyUsed,
      skipUsed: p.skipUsed,
      streak: p.streak,
      bestStreak: p.bestStreak,
      pendingWager: p.pendingWager,
    })),
    hostConnected: true,
  });
}

export async function broadcastLeaderboard(gameId: string): Promise<void> {
  const players = await prisma.player.findMany({
    where: { gameId },
    orderBy: { score: "desc" },
  });
  await broadcastToGame(gameId, "game:leaderboard", {
    players: players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      emoji: p.emoji,
      avatarUrl: p.avatarUrl,
      eliminated: p.eliminated,
      wrongCount: p.wrongCount,
      fiftyFiftyUsed: p.fiftyFiftyUsed,
      skipUsed: p.skipUsed,
      streak: p.streak,
      bestStreak: p.bestStreak,
      pendingWager: p.pendingWager,
    })),
  });
}

// Modalità presentatore (localPartyMode): stato della domanda corrente con i giudizi
// parziali dati dall'host (chi è stato giudicato e con che esito).
export async function emitLocalRoundState(gameId: string, gameQuestionId: string): Promise<void> {
  const [players, answers, game, gq] = await Promise.all([
    prisma.player.findMany({ where: { gameId }, select: { id: true } }),
    prisma.playerAnswer.findMany({ where: { gameQuestionId } }),
    prisma.game.findUnique({
      where: { id: gameId },
      select: {
        localTurnPlayerId: true,
        pointsOverrides: true,
        tournamentModes: true,
        totalQuestions: true,
        currentIndex: true,
      },
    }),
    prisma.gameQuestion.findUnique({
      where: { id: gameQuestionId },
      select: { question: { select: { points: true } } },
    }),
  ]);
  const judgments: Record<string, boolean | null> = {};
  for (const p of players) judgments[p.id] = null;
  for (const a of answers) judgments[a.playerId] = a.isCorrect;
  // Punti in palio per la domanda corrente (usati dallo splash "esatta/sbagliata").
  const questionPoints = game && gq?.question
    ? resolveBasePoints(game, gq.question.points)
    : undefined;
  await broadcastToGame(gameId, "game:local-state", {
    gameQuestionId,
    judgments,
    activePlayerId: game?.localTurnPlayerId ?? null,
    questionPoints,
  });
}

// Aggiorna la lista spettatori visibile all'host
export async function broadcastSpectatorList(gameId: string): Promise<void> {
  const all = await prisma.spectator.findMany({
    where: { gameId },
    orderBy: { joinedAt: "asc" },
  });
  await broadcastToHost(gameId, "spectator:list", {
    spectators: all.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      emoji: s.emoji,
      avatarUrl: s.avatarUrl,
      userId: s.userId,
    })),
  });
}
