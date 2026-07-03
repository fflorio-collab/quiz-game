"use client";

// Fase REVEAL sulla TV: risposta corretta evidenziata (flip da cartellone),
// esiti dei giocatori (✓/✗ + punti guadagnati) e banner del prossimo round.

import type { RevealData } from "@/types/game";
import { cn } from "@/lib/utils";

export interface RevealViewProps {
  reveal: RevealData;
}

export function RevealView({ reveal }: RevealViewProps) {
  const results = [...reveal.playerResults].sort(
    (a, b) => Number(b.wasCorrect) - Number(a.wasCorrect) || b.pointsEarned - a.pointsEarned,
  );
  const correctCount = results.filter((r) => r.wasCorrect).length;

  return (
    <div className="flex flex-1 flex-col">
      <span className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-muted">
        La risposta esatta è
      </span>

      <div className="animate-reveal-flip rounded-3xl border border-win/40 bg-win/10 p-8 text-center shadow-glow md:p-12">
        <div className="tv-title text-win !text-4xl md:!text-7xl">{reveal.correctAnswerText}</div>
      </div>

      {reveal.nextRound && (
        <div className="mt-5 inline-flex w-fit items-center gap-3 rounded-full border border-spark/40 bg-spark/10 px-5 py-2 text-spark">
          <span className="text-lg">➡️</span>
          <span className="font-semibold">
            Round {reveal.nextRound.roundNumber}/{reveal.nextRound.totalRounds}: {reveal.nextRound.modeLabel}
          </span>
        </div>
      )}

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-display text-xl uppercase tracking-[0.14em] text-gold">Esiti</h2>
        <span className="text-sm text-muted">
          {correctCount} corrett{correctCount === 1 ? "a" : "e"} su {results.length}
        </span>
      </div>

      {results.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map((r) => (
            <li
              key={r.playerId}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-2.5 animate-slide-up",
                r.wasCorrect ? "border-win/40 bg-win/10" : "border-line bg-white/[0.02]",
              )}
            >
              <span className="text-xl">{r.wasCorrect ? "✅" : "❌"}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.nickname}</span>
                {r.answerText && (
                  <span className="block truncate text-xs text-muted">“{r.answerText}”</span>
                )}
              </span>
              <span
                className={cn(
                  "shrink-0 font-display tabular-nums",
                  r.pointsEarned > 0 ? "text-win" : "text-muted",
                )}
              >
                {r.pointsEarned > 0 ? `+${r.pointsEarned}` : "0"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RevealView;
