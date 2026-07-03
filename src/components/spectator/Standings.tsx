"use client";

// Classifica laterale sempre visibile nella vista TV. Sola lettura.
// Ordina per punteggio decrescente ed evidenzia gli id passati (es. chi ha
// appena risposto giusto durante il reveal).

import type { PlayerInfo } from "@/types/game";
import { cn } from "@/lib/utils";
import { MEDALS } from "./shared";

export interface StandingsProps {
  players: PlayerInfo[];
  /** Id da evidenziare (anello verde), es. i corretti nel reveal */
  highlightIds?: Set<string>;
  title?: string;
}

export function Standings({ players, highlightIds, title = "Classifica" }: StandingsProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg uppercase tracking-[0.14em] text-gold">{title}</h2>
        <span className="shrink-0 text-xs text-muted">{sorted.length} in gioco</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-muted">Nessun giocatore ancora.</p>
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2 transition-all animate-slide-up",
                i === 0
                  ? "border-gold/40 bg-gold/10"
                  : "border-line bg-white/[0.02]",
                highlightIds?.has(p.id) && "ring-2 ring-win/70",
              )}
            >
              <span className="w-7 shrink-0 text-center font-display text-lg tabular-nums">
                {MEDALS[i] ?? i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p.emoji ? `${p.emoji} ` : ""}
                {p.nickname}
              </span>
              <span className="shrink-0 font-display tabular-nums text-gold">{p.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default Standings;
