"use client";

import { CodeBadge } from "@/components/ui";

interface Props {
  nickname: string;
  emoji: string | null;
  code: string | null;
  playersCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

// Lobby lato giocatore: "Sei dentro!" con la propria identità e l'attesa dello
// start. Toggle audio incluso (serve anche a "sbloccare" l'AudioContext su iOS).
export default function WaitingView({
  nickname,
  emoji,
  code,
  playersCount,
  soundEnabled,
  onToggleSound,
}: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div className="animate-fade-in flex flex-col items-center gap-4">
        <div className="grid h-28 w-28 place-items-center rounded-full border border-gold/30 bg-panel text-6xl shadow-glow">
          {emoji ?? "🎮"}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Sei dentro!
          </p>
          <h1 className="font-display text-3xl uppercase tracking-wide text-white">
            {nickname}
          </h1>
        </div>
      </div>

      <div className="animate-slide-up flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-muted">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-win opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-win" />
          </span>
          <span className="text-lg">In attesa del via…</span>
        </div>
        {playersCount > 0 && (
          <p className="text-sm text-muted">
            {playersCount} {playersCount === 1 ? "giocatore" : "giocatori"} in sala
          </p>
        )}
      </div>

      {code && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Partita</span>
          <CodeBadge code={code} size="inline" />
        </div>
      )}

      <button
        type="button"
        onClick={onToggleSound}
        className="btn-secondary mt-2 min-h-[56px] px-6 text-base"
      >
        {soundEnabled ? "🔊 Audio attivo" : "🔇 Audio disattivo"}
      </button>
    </div>
  );
}
