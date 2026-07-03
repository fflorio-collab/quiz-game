"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { Leaderboard } from "./Leaderboard";
import { cn } from "@/lib/utils";
import type { PlayerInfo } from "@/types/game";

export interface PodiumViewProps {
  players: PlayerInfo[];
}

const PODIUM = [
  { medal: "🥈", h: "h-40", order: "order-1", tone: "from-white/10" },
  { medal: "🥇", h: "h-56", order: "order-2", tone: "from-gold/25" },
  { medal: "🥉", h: "h-32", order: "order-3", tone: "from-ember/15" },
];

// Podio finale: 🥇🥈🥉 che salgono dal basso + classifica completa.
export function PodiumView({ players }: PodiumViewProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  // Ordine visivo: 2° a sinistra, 1° al centro, 3° a destra.
  const arranged = [top3[1], top3[0], top3[2]];

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-5xl flex-col items-center justify-center gap-10 p-6">
      <h1 className="tv-title text-gold">Classifica finale</h1>

      <div className="flex w-full max-w-3xl items-end justify-center gap-4">
        {arranged.map((p, i) =>
          p ? (
            <div key={p.id} className={cn("flex flex-1 flex-col items-center", PODIUM[i].order)}>
              <div className="mb-2 text-5xl">{PODIUM[i].medal}</div>
              {p.emoji && <div className="text-3xl">{p.emoji}</div>}
              <p className="mb-1 max-w-full truncate text-center font-display text-xl text-white">
                {p.nickname}
              </p>
              <p className="mb-3 font-display text-3xl text-gold tabular-nums">{p.score}</p>
              <div
                className={cn(
                  "w-full animate-podium-rise rounded-t-2xl border border-line bg-gradient-to-b to-panel",
                  PODIUM[i].h,
                  PODIUM[i].tone,
                )}
              />
            </div>
          ) : (
            <div key={i} className={cn("flex-1", PODIUM[i].order)} />
          ),
        )}
      </div>

      {sorted.length > 3 && (
        <Card className="w-full max-w-2xl">
          <Leaderboard players={sorted.slice(3)} compact />
        </Card>
      )}

      <Link href="/host" className="btn-secondary">
        Nuova partita
      </Link>
    </div>
  );
}

export default PodiumView;
