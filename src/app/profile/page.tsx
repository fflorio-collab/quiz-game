"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { xpToNextLevel } from "@/lib/gamification/xp";

type UserData = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  image: string | null;
  level: number;
  xp: number;
  coins: number;
  totalGames: number;
  totalWins: number;
  totalCorrect: number;
  bestStreak: number;
  dailyStreak: number;
  plan: string;
  createdAt: string;
};

type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

type GameEntry = {
  id: string;
  nickname: string;
  score: number;
  difficulty: string;
  totalQuestions: number;
  correctAnswers: number;
  bestStreak: number;
  questionType: string | null;
  gameMode: string | null;
  createdAt: string;
};

const RARITY_STYLE: Record<string, string> = {
  common: "border-border bg-surface",
  rare: "border-accent/50 bg-accent/10",
  epic: "border-purple-500/50 bg-purple-500/10",
  legendary: "border-gold bg-gold/10",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentGames, setRecentGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/signin?callbackUrl=/profile"); return; }

    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { router.push("/signin"); return; }
        setUser(d.user);
        setBadges(d.badges);
        setRecentGames(d.recentGames);
        setLoading(false);
      });

    // Tick daily streak al primo caricamento del profilo
    fetch("/api/user/daily-tick", { method: "POST" }).catch(() => {});
  }, [status, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Caricamento profilo...</p>
      </main>
    );
  }

  const { current, next, progress } = xpToNextLevel(user.xp);
  const winRate = user.totalGames > 0 ? Math.round((user.totalWins / user.totalGames) * 100) : 0;
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="apple-link text-sm">‹ Home</Link>
          <Link href="/pricing" className="text-xs text-muted hover:text-white">
            Piano: <span className="font-bold text-accent">{user.plan}</span>
          </Link>
        </div>

        {/* Header profilo */}
        <div className="card flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex-shrink-0">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-accent" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-accent/20 border-4 border-accent flex items-center justify-center text-4xl font-bold">
                {(user.displayName ?? user.username ?? "?")[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center md:text-left">
            <h1 className="text-3xl font-bold">{user.displayName ?? user.username}</h1>
            {user.username && <p className="text-muted">@{user.username}</p>}
            <div className="mt-4 flex items-center gap-4 justify-center md:justify-start">
              <div>
                <span className="text-5xl font-bold text-accent">{user.level}</span>
                <span className="text-muted text-sm ml-2">Livello</span>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>{current.toLocaleString("it-IT")} XP</span>
                  <span>{next > 0 ? `${next.toLocaleString("it-IT")} per L${user.level + 1}` : "MAX"}</span>
                </div>
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${Math.min(100, progress * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center">
            <p className="text-3xl font-bold">{user.totalGames}</p>
            <p className="text-xs text-muted mt-1">Partite</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-gold">{user.totalWins}</p>
            <p className="text-xs text-muted mt-1">Vittorie ({winRate}%)</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-success">{user.totalCorrect}</p>
            <p className="text-xs text-muted mt-1">Risposte corrette</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-orange-400">🔥 {user.dailyStreak}</p>
            <p className="text-xs text-muted mt-1">Daily streak</p>
          </div>
        </div>

        {/* Badges */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Badge sbloccati</h2>
            <span className="text-sm text-muted">{unlockedCount} / {badges.length}</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  b.unlocked
                    ? RARITY_STYLE[b.rarity] ?? RARITY_STYLE.common
                    : "border-border/30 bg-surface/20 opacity-40"
                }`}
                title={b.description}
              >
                <div className={`text-4xl mb-1 ${b.unlocked ? "" : "grayscale"}`}>{b.icon}</div>
                <p className="text-xs font-semibold leading-tight">{b.name}</p>
                <p className="text-[10px] text-muted uppercase tracking-wide mt-1">{b.rarity}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent games */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Ultime partite</h2>
          {recentGames.length === 0 ? (
            <p className="text-muted text-center py-6">Non hai ancora giocato. <Link href="/host" className="apple-link">Crea la tua prima partita</Link> o <Link href="/player" className="apple-link">unisciti con un codice</Link>.</p>
          ) : (
            <div className="space-y-2">
              {recentGames.map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{g.gameMode ?? g.questionType ?? "Partita"}</p>
                    <p className="text-xs text-muted">
                      {new Date(g.createdAt).toLocaleDateString("it-IT", { dateStyle: "medium" })} ·
                      {" "}{g.correctAnswers}/{g.totalQuestions} corrette · streak {g.bestStreak}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-accent">{g.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
