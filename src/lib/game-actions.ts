import { prisma } from "@/lib/prisma";
import { broadcastToGame } from "@/lib/pusher-server";
import { describeGameMode } from "@/lib/gameMode";
import { xpForGame, levelFromXp } from "@/lib/gamification/xp";
import { evaluateBadgeUnlocks } from "@/lib/gamification/badges";

// Azioni "macro" sulla partita richiamabili sia da API routes Next.js sia
// (in transizione) da server/socket-server.ts (migration vercel-pusher fase 7).
// I broadcast usano Pusher (non Socket.io). socket-server.ts viene rimosso al cutover.

// ─── Helpers di cleanup (versioni DB-only delle clear* di socket-server.ts) ──

export async function clearQuestionDeadlineDb(gameId: string) {
  await prisma.game.update({
    where: { id: gameId },
    data: { currentQuestionDeadline: null },
  });
}

export async function clearSpeedrunStateDb(gameId: string) {
  await prisma.game.update({
    where: { id: gameId },
    data: { speedrunStartedAt: null },
  });
}

export async function clearJudgingDb(gameId: string) {
  await prisma.gameQuestion.updateMany({
    where: { gameId, awaitingJudgment: true },
    data: { awaitingJudgment: false },
  });
}

export async function clearRevealDb(gameId: string) {
  await prisma.gameQuestion.updateMany({
    where: { gameId, revealedAt: { not: null } },
    data: { revealedAt: null },
  });
}

// ─── finishGame ──────────────────────────────────────────────────────────────

export async function finishGame(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { orderBy: { score: "desc" }, include: { answers: true } } },
  });
  if (!game) return;
  if (game.status === "FINISHED") {
    // Idempotente: se già finita non rifare badge/xp.
    await broadcastToGame(gameId, "game:finished", {
      players: game.players.map((p) => ({
        id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl,
        eliminated: p.eliminated, wrongCount: p.wrongCount, streak: p.streak, bestStreak: p.bestStreak,
      })),
    });
    return;
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { status: "FINISHED", finishedAt: new Date() },
  });

  const gameMode = describeGameMode(game);
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  const winnerId = sortedPlayers[0]?.id;
  const podiumIds = new Set(sortedPlayers.slice(0, 3).map((p) => p.id));
  const nowHour = new Date().getHours();

  for (const player of game.players) {
    const correctCount = player.answers.filter((a) => a.isCorrect).length;
    await prisma.leaderboard.create({
      data: {
        nickname: player.nickname,
        score: player.score,
        difficulty: game.difficulty,
        totalQuestions: game.totalQuestions,
        correctAnswers: correctCount,
        bestStreak: player.bestStreak,
        wrongCount: player.wrongCount,
        fiftyFiftyUsed: player.fiftyFiftyUsed,
        skipUsed: player.skipUsed,
        eliminated: player.eliminated,
        questionType: game.questionType,
        gameMode,
        userId: player.userId ?? null,
      },
    });

    if (player.userId) {
      const isWin = player.id === winnerId;
      const isPodium = podiumIds.has(player.id);
      const livesRemaining = game.livesAllowed
        ? Math.max(0, game.livesAllowed - player.wrongCount)
        : 0;
      const xpGained = xpForGame({
        correctAnswers: correctCount,
        bestStreak: player.bestStreak,
        isWin,
        isPodium,
        livesRemaining,
        difficulty: game.difficulty,
      });
      const userBefore = await prisma.user.findUnique({ where: { id: player.userId } });
      if (userBefore) {
        const newXp = userBefore.xp + xpGained;
        const newLevel = levelFromXp(newXp);
        const updatedUser = await prisma.user.update({
          where: { id: player.userId },
          data: {
            xp: newXp,
            level: newLevel,
            totalGames: userBefore.totalGames + 1,
            totalWins: userBefore.totalWins + (isWin ? 1 : 0),
            totalCorrect: userBefore.totalCorrect + correctCount,
            bestStreak: Math.max(userBefore.bestStreak, player.bestStreak),
          },
        });
        const existing = await prisma.userBadge.findMany({
          where: { userId: player.userId },
          include: { badge: true },
        });
        const alreadyUnlocked = new Set(existing.map((ub) => ub.badge.slug));
        const newSlugs = evaluateBadgeUnlocks(
          {
            userAfter: {
              id: updatedUser.id,
              totalGames: updatedUser.totalGames,
              totalWins: updatedUser.totalWins,
              totalCorrect: updatedUser.totalCorrect,
              bestStreak: updatedUser.bestStreak,
              dailyStreak: updatedUser.dailyStreak,
            },
            gameResult: {
              correctAnswers: correctCount,
              totalQuestions: game.totalQuestions,
              bestStreak: player.bestStreak,
              isWin,
              fiftyFiftyUsed: player.fiftyFiftyUsed,
              skipUsed: player.skipUsed,
            },
            alreadyUnlocked,
          },
          updatedUser.level,
          nowHour,
        );
        if (newSlugs.length > 0) {
          const badgesToAward = await prisma.badge.findMany({ where: { slug: { in: newSlugs } } });
          for (const b of badgesToAward) {
            try {
              await prisma.userBadge.create({ data: { userId: player.userId, badgeId: b.id } });
            } catch {
              // già assegnato (constraint)
            }
          }
        }
      }
    }
  }

  // Reset campi runtime persistiti in DB
  await prisma.game.update({
    where: { id: gameId },
    data: { localTurnPlayerId: null, awaitingCategoryPick: false },
  });
  await clearRevealDb(gameId);
  await clearJudgingDb(gameId);
  await clearSpeedrunStateDb(gameId);
  await clearQuestionDeadlineDb(gameId);

  await broadcastToGame(gameId, "game:finished", {
    players: game.players.map((p) => ({
      id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji, avatarUrl: p.avatarUrl,
      eliminated: p.eliminated, wrongCount: p.wrongCount, streak: p.streak, bestStreak: p.bestStreak,
    })),
  });
}
