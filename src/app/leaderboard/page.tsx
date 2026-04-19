"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  nickname: string;
  score: number;
  difficulty: string;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: string;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [difficulty, setDifficulty] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = difficulty
      ? `/api/leaderboard?difficulty=${difficulty}`
      : "/api/leaderboard";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard);
        setLoading(false);
      });
  }, [difficulty]);

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-muted hover:text-white text-sm">
          ← Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
          🏆 Classifica globale
        </h1>

        {/* Filtri difficoltà */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "", label: "Tutte" },
            { value: "EASY", label: "Facile" },
            { value: "MEDIUM", label: "Medio" },
            { value: "HARD", label: "Difficile" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(opt.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                difficulty === opt.value
                  ? "border-accent bg-accent/10 text-white"
                  : "border-border text-muted hover:border-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted">Caricamento...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted">
            Nessun punteggio registrato. Gioca la prima partita!
          </div>
        ) : (
          <div className="card">
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    i === 0
                      ? "bg-warning/10 border border-warning/30"
                      : i === 1 || i === 2
                        ? "bg-border"
                        : "bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-lg w-8 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{e.nickname}</p>
                      <p className="text-xs text-muted">
                        {e.correctAnswers}/{e.totalQuestions} corrette ·{" "}
                        {e.difficulty === "EASY"
                          ? "Facile"
                          : e.difficulty === "MEDIUM"
                            ? "Medio"
                            : "Difficile"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-accent tabular-nums">
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
