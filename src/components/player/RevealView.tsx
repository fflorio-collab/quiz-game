"use client";

import type { PlayerInfo, RevealData } from "@/types/game";

interface Props {
  reveal: RevealData;
  myId: string;
  /** Leaderboard live (se disponibile). Fallback ai playerResults del reveal. */
  players: PlayerInfo[];
}

type Row = { id: string; nickname: string; score: number; emoji: string | null };

export default function RevealView({ reveal, myId, players }: Props) {
  const mine = reveal.playerResults.find((r) => r.playerId === myId);

  // Sorgente classifica compatta: leaderboard live, o i risultati del reveal.
  const rows: Row[] =
    players.length > 0
      ? players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, emoji: p.emoji ?? null }))
      : [...reveal.playerResults]
          .sort((a, b) => b.totalScore - a.totalScore)
          .map((r) => ({ id: r.playerId, nickname: r.nickname, score: r.totalScore, emoji: null }));

  const correct = mine?.wasCorrect ?? null;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center gap-6 px-5 py-8">
      {/* Esito personale */}
      {correct === null ? (
        <div className="animate-fade-in flex flex-col items-center gap-2 pt-6">
          <div className="grid h-24 w-24 place-items-center rounded-full border border-line bg-panel text-5xl">
            🤔
          </div>
          <p className="text-lg text-muted">Nessuna risposta da parte tua</p>
        </div>
      ) : (
        <div className="animate-reveal-flip flex flex-col items-center gap-3 pt-4">
          <div
            className={
              "grid h-32 w-32 place-items-center rounded-full text-7xl shadow-glow " +
              (correct
                ? "border border-win/50 bg-win/10 text-win"
                : "border border-lose/50 bg-lose/10 text-lose")
            }
          >
            {correct ? "✅" : "❌"}
          </div>
          <h1 className="font-display text-3xl uppercase tracking-wide text-white">
            {correct ? "Esatto!" : "Sbagliato"}
          </h1>
          {mine && (
            <span
              className={
                "animate-score-pop font-display text-4xl tabular-nums " +
                (mine.pointsEarned >= 0 ? "text-gold" : "text-lose")
              }
            >
              {mine.pointsEarned >= 0 ? "+" : ""}
              {mine.pointsEarned}
            </span>
          )}
        </div>
      )}

      {/* Risposta corretta */}
      <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gold/80">Risposta corretta</p>
        <p className="mt-1 text-lg font-semibold text-white">{reveal.correctAnswerText}</p>
      </div>

      {/* Classifica compatta */}
      <div className="w-full max-w-md">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">Classifica</p>
        <ul className="flex flex-col gap-1.5">
          {rows.slice(0, 6).map((r, i) => {
            const me = r.id === myId;
            return (
              <li
                key={r.id}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 " +
                  (me ? "border border-gold/40 bg-gold/10" : "border border-line bg-panel")
                }
              >
                <span className="w-6 text-center font-display text-lg text-muted tabular-nums">
                  {i + 1}
                </span>
                <span className="text-xl">{r.emoji ?? "🎮"}</span>
                <span className={"flex-1 truncate font-semibold " + (me ? "text-gold" : "text-white")}>
                  {r.nickname}
                  {me && <span className="ml-1 text-xs text-gold/70">(tu)</span>}
                </span>
                <span className="font-display tabular-nums text-white">{r.score}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
