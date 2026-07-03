"use client";

import type { PlayerInfo } from "@/types/game";

interface Props {
  ranking: PlayerInfo[];
  myId: string;
}

const MEDAL = ["🥇", "🥈", "🥉"];

// Fine partita: la TUA posizione in grande + il podio (top 3).
export default function PodiumView({ ranking, myId }: Props) {
  const sorted = [...ranking].sort((a, b) => b.score - a.score);
  const myIndex = sorted.findIndex((p) => p.id === myId);
  const me = myIndex >= 0 ? sorted[myIndex] : null;
  const myPos = myIndex >= 0 ? myIndex + 1 : null;
  const top3 = sorted.slice(0, 3);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center gap-8 px-6 py-10 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-muted">Partita finita</p>

      {/* La mia posizione */}
      {me && myPos && (
        <div className="animate-podium-rise flex flex-col items-center gap-2">
          <div className="text-6xl">{myPos <= 3 ? MEDAL[myPos - 1] : "🎖️"}</div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">La tua posizione</p>
          <h1 className="font-display text-7xl leading-none text-gold shadow-glow">
            {myPos}
            <span className="ml-1 align-top text-2xl text-muted">
              / {sorted.length}
            </span>
          </h1>
          <div className="mt-1 flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5">
            <span className="text-xl">{me.emoji ?? "🎮"}</span>
            <span className="font-semibold text-white">{me.nickname}</span>
            <span className="font-display tabular-nums text-gold">{me.score}</span>
          </div>
        </div>
      )}

      {/* Podio top 3 */}
      <div className="w-full max-w-md">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">Podio</p>
        <ul className="flex flex-col gap-2">
          {top3.map((p, i) => {
            const mine = p.id === myId;
            return (
              <li
                key={p.id}
                className={
                  "animate-slide-up flex items-center gap-3 rounded-2xl px-4 py-3 " +
                  (mine ? "border border-gold/50 bg-gold/10" : "border border-line bg-panel")
                }
              >
                <span className="text-2xl">{MEDAL[i]}</span>
                <span className="text-2xl">{p.emoji ?? "🎮"}</span>
                <span className={"flex-1 truncate text-left font-semibold " + (mine ? "text-gold" : "text-white")}>
                  {p.nickname}
                  {mine && <span className="ml-1 text-xs text-gold/70">(tu)</span>}
                </span>
                <span className="font-display text-xl tabular-nums text-white">{p.score}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
