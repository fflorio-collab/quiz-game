"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GAME_MODE_FAMILIES } from "@/lib/gameMode";

type Entry = {
  id: string;
  nickname: string;
  score: number;
  difficulty: string;
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
  wrongCount: number;
  fiftyFiftyUsed: number;
  skipUsed: number;
  eliminated: boolean;
  questionType: string | null;
  gameMode: string | null;
  createdAt: string;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [difficulty, setDifficulty] = useState<string>("");
  const [mode, setMode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (difficulty) params.set("difficulty", difficulty);
    if (mode) params.set("mode", mode);
    const qs = params.toString();
    fetch(qs ? `/api/leaderboard?${qs}` : "/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard);
        setLoading(false);
      });
  }, [difficulty, mode]);

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

        {/* Filtri difficoltà */}
        <div className="flex flex-wrap gap-2 mb-3">
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

        {/* Filtri modalità */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setMode("")}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              mode === ""
                ? "border-gold bg-gold/10 text-white"
                : "border-border text-muted hover:border-muted"
            }`}
          >
            Tutte le modalità
          </button>
          {GAME_MODE_FAMILIES.map((fam) => (
            <button
              key={fam}
              onClick={() => setMode(fam)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                mode === fam
                  ? "border-gold bg-gold/10 text-white"
                  : "border-border text-muted hover:border-muted"
              }`}
            >
              {fam}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted">Caricamento...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted">
            Nessun punteggio per questi filtri. Gioca una partita!
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{e.nickname}</p>
                        {e.gameMode && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent/80">
                            {e.gameMode}
                          </span>
                        )}
                        {e.eliminated && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger/20 text-danger" title="Eliminato durante la partita">
                            ✕ eliminato
                          </span>
                        )}
                        {!e.eliminated && e.gameMode && (e.gameMode === "Ultimo in piedi" || e.gameMode.startsWith("Caduta libera")) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success" title="Sopravvissuto fino alla fine">
                            ✓ sopravvissuto
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {e.correctAnswers}/{e.totalQuestions} corrette ·{" "}
                        {e.difficulty === "EASY"
                          ? "Facile"
                          : e.difficulty === "MEDIUM"
                            ? "Medio"
                            : "Difficile"}
                        {e.bestStreak > 1 && (
                          <> · 🔥 streak {e.bestStreak}</>
                        )}
                        {(e.fiftyFiftyUsed > 0 || e.skipUsed > 0) && (
                          <>
                            {" · aiuti: "}
                            {e.fiftyFiftyUsed > 0 && <>50/50×{e.fiftyFiftyUsed} </>}
                            {e.skipUsed > 0 && <>Salto×{e.skipUsed}</>}
                          </>
                        )}
                      </p>
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
