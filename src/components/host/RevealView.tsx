"use client";

import { Button, Card, Chip } from "@/components/ui";
import { Leaderboard } from "./Leaderboard";
import { cn } from "@/lib/utils";
import type { PlayerInfo, RevealData } from "@/types/game";

export interface RevealViewProps {
  reveal: RevealData;
  players: PlayerInfo[];
  advancing: boolean;
  onNext: () => void;
}

// Reveal della risposta corretta + esiti + classifica. Se il reveal chiude un
// round del torneo mostra la schermata di passaggio al round successivo.
export function RevealView({ reveal, players, advancing, onNext }: RevealViewProps) {
  const nextRound = reveal.nextRound;
  const deltas: Record<string, number> = {};
  for (const r of reveal.playerResults) deltas[r.playerId] = r.pointsEarned;

  if (nextRound) {
    return (
      <div className="mx-auto flex min-h-[92vh] max-w-4xl flex-col items-center justify-center gap-8 p-6 text-center">
        <Chip tone="gold" className="text-sm">
          Round {nextRound.roundNumber - 1} completato
        </Chip>
        <h1 className="tv-title text-gold">Round {nextRound.roundNumber - 1} finito!</h1>
        <Card glow className="w-full max-w-2xl">
          <Leaderboard players={players} medals deltas={deltas} />
        </Card>
        <div className="rounded-2xl border border-line bg-panel px-6 py-4">
          <p className="text-sm uppercase tracking-widest text-muted">
            Prossimo round · {nextRound.roundNumber}/{nextRound.totalRounds}
          </p>
          <p className="mt-1 font-display text-2xl text-white">{nextRound.modeLabel}</p>
        </div>
        <Button size="xl" onClick={onNext} loading={advancing}>
          Inizia round {nextRound.roundNumber}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[92vh] max-w-6xl grid-cols-1 gap-8 p-6 lg:grid-cols-[1fr_0.9fr]">
      {/* Risposta corretta + esiti */}
      <div className="flex flex-col justify-center">
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-muted">
          Risposta corretta
        </p>
        <div className="animate-reveal-flip rounded-3xl border-2 border-win/50 bg-win/10 p-8">
          <p className="font-display text-4xl text-win md:text-5xl">
            {reveal.correctAnswerText || "—"}
          </p>
        </div>

        <div className="mt-6 space-y-2">
          {reveal.playerResults.map((r) => (
            <div
              key={r.playerId}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3",
                r.wasCorrect ? "border-win/40 bg-win/5" : "border-line bg-panel",
              )}
            >
              <span className={cn("text-2xl", r.wasCorrect ? "text-win" : "text-lose")}>
                {r.wasCorrect ? "✓" : "✗"}
              </span>
              <span className="flex-1 truncate font-semibold text-white">{r.nickname}</span>
              {r.answerText && (
                <span className="max-w-[40%] truncate text-sm text-muted">{r.answerText}</span>
              )}
              <span
                className={cn(
                  "font-display text-xl tabular-nums",
                  r.pointsEarned > 0 ? "text-win" : "text-muted",
                )}
              >
                {r.pointsEarned > 0 ? `+${r.pointsEarned}` : r.pointsEarned}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Classifica + avanti */}
      <div className="flex flex-col">
        <h2 className="mb-4 font-display text-2xl uppercase tracking-wide text-white">
          Classifica
        </h2>
        <div className="flex-1 overflow-y-auto">
          <Leaderboard players={players} medals deltas={deltas} />
        </div>
        <Button size="xl" className="mt-6 w-full" onClick={onNext} loading={advancing}>
          Prossima domanda
        </Button>
      </div>
    </div>
  );
}

export default RevealView;
