"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  nickname: string;
  score: number;
  createdAt: string;
};

// "4 lug 2026, 21:34"
function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="apple-link text-sm inline-flex">
          ‹ Home
        </Link>
        <p className="chip-gold mt-4 mb-2 inline-flex">Hall of Fame</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-8">
          Classifica globale.
        </h1>

        {loading ? (
          <div className="text-center py-12 text-muted">Caricamento...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted">
            Nessun punteggio ancora. Gioca una partita!
          </div>
        ) : (
          <div className="card">
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl ${
                    i === 0
                      ? "bg-gold/10 ring-1 ring-gold/30"
                      : i === 1 || i === 2
                        ? "bg-white/5"
                        : "bg-black/20"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-bold text-lg w-8 text-center flex-shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{e.nickname}</p>
                      <p className="text-xs text-muted mt-0.5">{formatWhen(e.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-accent tabular-nums flex-shrink-0">
                    {e.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
