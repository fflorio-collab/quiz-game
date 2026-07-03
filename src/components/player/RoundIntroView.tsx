"use client";

import type { RevealData } from "@/types/game";

interface Props {
  nextRound: NonNullable<RevealData["nextRound"]>;
}

// Splash "Round N" ai confini di round del torneo (da reveal.nextRound).
export default function RoundIntroView({ nextRound }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="animate-fade-in">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">
          Round {nextRound.roundNumber} di {nextRound.totalRounds}
        </p>
      </div>
      <h1 className="animate-slide-up font-display text-6xl uppercase tracking-tight text-gold shadow-glow">
        Round {nextRound.roundNumber}
      </h1>
      <div className="animate-slide-up rounded-full border border-gold/30 bg-gold/10 px-6 py-2">
        <span className="text-lg font-semibold uppercase tracking-wide text-gold">
          {nextRound.modeLabel}
        </span>
      </div>
      <p className="mt-2 text-muted">Preparati…</p>
    </div>
  );
}
