"use client";

import { cn } from "@/lib/utils";
import type { PlayerInfo } from "@/types/game";

export interface LeaderboardProps {
  players: PlayerInfo[];
  /** Evidenzia il giocatore di turno (id) */
  activeId?: string | null;
  /** id → punti guadagnati nell'ultimo reveal (per il pop) */
  deltas?: Record<string, number>;
  /** Mostra le medaglie ai primi 3 */
  medals?: boolean;
  className?: string;
  compact?: boolean;
}

const MEDAL = ["🥇", "🥈", "🥉"];

// Classifica ordinata (già ordinata a monte per punteggio) leggibile da lontano.
export function Leaderboard({
  players,
  activeId,
  deltas,
  medals = false,
  className,
  compact = false,
}: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {sorted.map((p, i) => {
        const delta = deltas?.[p.id];
        const active = activeId && p.id === activeId;
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 transition-all",
              compact ? "py-2" : "py-3",
              active
                ? "border-gold/60 bg-gold/10 shadow-glow"
                : "border-line bg-panel",
              p.eliminated && "opacity-40",
            )}
          >
            <span
              className={cn(
                "w-8 shrink-0 text-center font-display tabular-nums",
                compact ? "text-lg" : "text-2xl",
                i === 0 ? "text-gold" : "text-muted",
              )}
            >
              {medals && i < 3 ? MEDAL[i] : i + 1}
            </span>
            {p.emoji && <span className="text-2xl">{p.emoji}</span>}
            <span
              className={cn(
                "flex-1 truncate font-semibold",
                compact ? "text-base" : "text-xl",
                active ? "text-gold" : "text-white",
              )}
            >
              {p.nickname}
              {active && <span className="ml-2 text-sm text-gold">🎯 tocca a lui</span>}
            </span>
            {p.streak > 1 && (
              <span className="rounded-full bg-ember/15 px-2 py-0.5 text-xs font-bold text-ember">
                🔥 {p.streak}
              </span>
            )}
            <span
              className={cn(
                "font-display tabular-nums",
                compact ? "text-xl" : "text-3xl",
                "text-gold",
              )}
            >
              {p.score}
            </span>
            {delta !== undefined && delta !== 0 && (
              <span
                className={cn(
                  "animate-score-pop font-display text-lg tabular-nums",
                  delta > 0 ? "text-win" : "text-lose",
                )}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            )}
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="py-6 text-center text-muted">Nessun giocatore.</p>
      )}
    </div>
  );
}

export default Leaderboard;
