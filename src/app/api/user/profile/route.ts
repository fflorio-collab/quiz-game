import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Ritorna il profilo completo dell'utente loggato:
 * stats + badge sbloccati + badge totali + ultime 10 partite.
 */
export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const [user, allBadges, userBadges, recentGames] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.badge.findMany({ orderBy: { slug: "asc" } }),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    prisma.leaderboard.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User non trovato" }, { status: 404 });

  const unlockedSlugs = new Set(userBadges.map((ub) => ub.badge.slug));

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      image: user.image,
      level: user.level,
      xp: user.xp,
      coins: user.coins,
      totalGames: user.totalGames,
      totalWins: user.totalWins,
      totalCorrect: user.totalCorrect,
      bestStreak: user.bestStreak,
      dailyStreak: user.dailyStreak,
      plan: user.plan,
      createdAt: user.createdAt,
    },
    badges: allBadges.map((b) => ({
      ...b,
      unlocked: unlockedSlugs.has(b.slug),
      unlockedAt: userBadges.find((ub) => ub.badge.slug === b.slug)?.unlockedAt ?? null,
    })),
    recentGames: recentGames.map((g) => ({
      id: g.id,
      nickname: g.nickname,
      score: g.score,
      difficulty: g.difficulty,
      totalQuestions: g.totalQuestions,
      correctAnswers: g.correctAnswers,
      bestStreak: g.bestStreak,
      questionType: g.questionType,
      gameMode: g.gameMode,
      createdAt: g.createdAt,
    })),
  });
}
