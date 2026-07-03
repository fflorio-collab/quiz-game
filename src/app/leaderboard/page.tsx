"use client";

// Hall of Fame ANONIMA (per nickname). Nessun riferimento a utenti/account/badge.
// GET /api/leaderboard (+ filtro difficoltà), tema game-show.

import { useCallback, useEffect, useState } from "react";
import { Logo, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/types/game";

interface LeaderboardRow {
  id: string;
  nickname: string;
  score: number;
  difficulty: string;
  totalQuestions: number;
  correctAnswers: number;
  bestStreak: number;
  gameMode: string | null;
  createdAt: string;
}

const FILTERS: Array<{ key: "ALL" | Difficulty; label: string }> = [
  { key: "ALL", label: "Tutte" },
  { key: "EASY", label: "Facile" },
  { key: "MEDIUM", label: "Medio" },
  { key: "HARD", label: "Difficile" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<"ALL" | Difficulty>("ALL");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: "ALL" | Difficulty) => {
    setLoading(true);
    setError(null);
    try {
      const qs = f === "ALL" ? "" : `?difficulty=${f}`;
      const res = await fetch(`/api/leaderboard${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const json = (await res.json()) as { leaderboard: LeaderboardRow[] };
      setRows(json.leaderboard ?? []);
    } catch {
      setError("Impossibile caricare la classifica.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <Logo size="md" />
        <h1 className="tv-title text-4xl md:text-5xl">🏆 Hall of Fame</h1>
        <p className="text-muted">I migliori punteggi di sempre.</p>
      </header>

      {/* Filtri difficoltà */}
      <div className="flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f.key
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-line text-muted hover:text-white",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-lose">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Ancora nessun punteggio in questa categoria. Gioca una partita per aprire le danze!
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className={cn(
                "flex items-center gap-4 rounded-2xl border px-4 py-3",
                i === 0
                  ? "border-gold/40 bg-gold/10"
                  : i < 3
                    ? "border-white/15 bg-white/[0.03]"
                    : "border-line bg-white/[0.02]",
              )}
            >
              <span className="w-9 shrink-0 text-center font-display text-xl tabular-nums">
                {MEDALS[i] ?? i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-bold">{r.nickname}</div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                  {r.gameMode && <span>{r.gameMode}</span>}
                  <span>
                    {r.correctAnswers}/{r.totalQuestions} corrette
                  </span>
                  {r.bestStreak > 0 && <span>🔥 serie {r.bestStreak}</span>}
                </div>
              </div>
              <span className="shrink-0 font-display text-2xl tabular-nums text-gold">{r.score}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="text-center">
        <a href="/" className="apple-link">
          ← Torna alla home
        </a>
      </div>
    </main>
  );
}
