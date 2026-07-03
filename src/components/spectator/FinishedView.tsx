"use client";

// Fase FINISHED sulla TV: podio 🥇🥈🥉 gigante + coda della classifica.

import type { PlayerInfo } from "@/types/game";
import { cn } from "@/lib/utils";
import { MEDALS } from "./shared";

export interface FinishedViewProps {
  ranking: PlayerInfo[];
}

// Ordine visivo del podio: 2° a sinistra, 1° al centro (più alto), 3° a destra.
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHT = ["h-40 md:h-52", "h-56 md:h-72", "h-32 md:h-40"];
const PODIUM_TONE = [
  "border-white/25 bg-white/[0.05]",
  "border-gold/50 bg-gold/10 shadow-glow-strong",
  "border-ember/30 bg-ember/10",
];

export function FinishedView({ ranking }: FinishedViewProps) {
  const sorted = [...ranking].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="chip-gold mb-2">Partita conclusa</span>
      <h1 className="tv-title mb-10 text-center text-5xl md:text-7xl">Classifica finale</h1>

      {/* Podio */}
      <div className="flex w-full max-w-4xl items-end justify-center gap-4 md:gap-8">
        {PODIUM_ORDER.map((rankIdx) => {
          const p = top3[rankIdx];
          if (!p) return <div key={rankIdx} className="flex-1" />;
          return (
            <div key={p.id} className="flex flex-1 flex-col items-center animate-podium-rise">
              <div className="mb-3 text-5xl md:text-6xl">{MEDALS[rankIdx]}</div>
              <div className="mb-1 max-w-full truncate text-center text-lg font-bold md:text-2xl">
                {p.emoji ? `${p.emoji} ` : ""}
                {p.nickname}
              </div>
              <div className="mb-3 font-display text-2xl tabular-nums text-gold md:text-3xl">
                {p.score}
              </div>
              <div
                className={cn(
                  "flex w-full items-start justify-center rounded-t-2xl border pt-4 font-display text-4xl tabular-nums md:text-6xl",
                  PODIUM_HEIGHT[rankIdx],
                  PODIUM_TONE[rankIdx],
                )}
              >
                {rankIdx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resto della classifica */}
      {rest.length > 0 && (
        <ol className="mt-10 w-full max-w-2xl space-y-2">
          {rest.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-2.5"
            >
              <span className="w-7 text-center font-display tabular-nums text-muted">{i + 4}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p.emoji ? `${p.emoji} ` : ""}
                {p.nickname}
              </span>
              <span className="font-display tabular-nums text-gold">{p.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default FinishedView;
