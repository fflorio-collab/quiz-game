/**
 * Motore Badge: valuta quali badge uno User sblocca al termine di una partita.
 * Tutti i badge core sono dichiarati qui con la loro condizione trigger.
 * Il seed script (prisma/seed-badges.ts) sincronizza la tabella Badge del DB con BADGE_DEFS.
 */

import type { PrismaClient } from "@prisma/client";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export interface BadgeDef {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
}

/**
 * Contesto per la valutazione dei badge al termine di una partita.
 * userAfter = stato User DOPO aver applicato XP e stat aggregati di questa partita.
 */
export interface BadgeEvalContext {
  userAfter: {
    id: string;
    totalGames: number;
    totalWins: number;
    totalCorrect: number;
    bestStreak: number;
    dailyStreak: number;
  };
  gameResult: {
    correctAnswers: number;
    totalQuestions: number;
    bestStreak: number;
    isWin: boolean;
    fiftyFiftyUsed: number;
    skipUsed: number;
  };
  // Slug dei badge già posseduti (così evitiamo duplicati)
  alreadyUnlocked: Set<string>;
}

export const BADGE_DEFS: BadgeDef[] = [
  { slug: "first-win", name: "Prima Vittoria", description: "Vinci la tua prima partita.", icon: "🥇", rarity: "common" },
  { slug: "triple-win", name: "Tripletta", description: "Vinci 3 partite.", icon: "🔥", rarity: "rare" },
  { slug: "sniper", name: "Sniper", description: "Vinci con il 100% di risposte corrette in almeno 10 domande.", icon: "🎯", rarity: "epic" },
  { slug: "streak-10", name: "Streak x10", description: "Raggiungi una streak di 10 risposte corrette consecutive in una singola partita.", icon: "💯", rarity: "rare" },
  { slug: "marathon", name: "Maratoneta", description: "Gioca 100 partite.", icon: "🏃", rarity: "common" },
  { slug: "daily-7", name: "Settimana perfetta", description: "7 giorni consecutivi di login + partita.", icon: "📅", rarity: "rare" },
  { slug: "no-help", name: "Nessun Aiuto", description: "Vinci senza usare 50/50 né Salto.", icon: "🚫", rarity: "rare" },
  { slug: "level-10", name: "Veterano", description: "Raggiungi il livello 10.", icon: "⭐", rarity: "rare" },
  { slug: "nightowl", name: "Notturno", description: "Gioca una partita tra le 00 e le 04.", icon: "🦉", rarity: "common" },
  { slug: "earlybird", name: "Mattiniero", description: "Gioca una partita tra le 06 e le 09.", icon: "☀️", rarity: "common" },
];

/**
 * Valuta ogni badge definito e ritorna gli slug dei nuovi badge da sbloccare.
 * NON filtra quelli già sbloccati: chi chiama passa il set `alreadyUnlocked`.
 */
export function evaluateBadgeUnlocks(ctx: BadgeEvalContext, userLevel: number, nowHour: number): string[] {
  const u = ctx.userAfter;
  const g = ctx.gameResult;
  const unlocks: string[] = [];

  const push = (slug: string) => {
    if (!ctx.alreadyUnlocked.has(slug)) unlocks.push(slug);
  };

  if (u.totalWins >= 1) push("first-win");
  if (u.totalWins >= 3) push("triple-win");
  if (g.isWin && g.totalQuestions >= 10 && g.correctAnswers === g.totalQuestions) push("sniper");
  if (g.bestStreak >= 10) push("streak-10");
  if (u.totalGames >= 100) push("marathon");
  if (u.dailyStreak >= 7) push("daily-7");
  if (g.isWin && g.fiftyFiftyUsed === 0 && g.skipUsed === 0) push("no-help");
  if (userLevel >= 10) push("level-10");
  if (nowHour >= 0 && nowHour < 4) push("nightowl");
  if (nowHour >= 6 && nowHour < 9) push("earlybird");

  return unlocks;
}

/**
 * Persiste i badge sbloccati per un utente (idempotente: skip se già assegnato).
 * Ritorna i BadgeDef effettivamente creati (per eventuale toast lato UI).
 */
export async function persistBadgeUnlocks(
  prisma: PrismaClient,
  userId: string,
  slugs: string[]
): Promise<BadgeDef[]> {
  if (slugs.length === 0) return [];
  const badges = await prisma.badge.findMany({ where: { slug: { in: slugs } } });
  const created: BadgeDef[] = [];
  for (const b of badges) {
    try {
      await prisma.userBadge.create({ data: { userId, badgeId: b.id } });
      const def = BADGE_DEFS.find((d) => d.slug === b.slug);
      if (def) created.push(def);
    } catch {
      // UNIQUE violation: già sbloccato, ignora
    }
  }
  return created;
}
