"use client";

import { useEffect, useRef } from "react";

export type AnnouncePlayer = {
  nickname: string;
  emoji?: string | null;
  avatarUrl?: string | null;
};

// Overlay a tutto schermo che annuncia chi deve rispondere ("Tocca a te!") prima
// della domanda. Auto-scompare dopo `durationMs`, oppure al tocco/click.
export default function TurnAnnounce({
  player,
  onDone,
  durationMs = 2600,
}: {
  player: AnnouncePlayer;
  onDone: () => void;
  durationMs?: number;
}) {
  // onDone in un ref per non riavviare il timer se il parent ricrea la callback.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  return (
    <div
      onClick={() => doneRef.current()}
      role="button"
      aria-label={`Tocca a ${player.nickname}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer overflow-hidden animate-fade-in"
      style={{
        background:
          "radial-gradient(circle at 50% 38%, rgba(41,151,255,0.28), #000 72%)",
      }}
    >
      <div className="text-center px-6 animate-announce-pop">
        <p className="text-gold text-xl md:text-3xl font-semibold uppercase tracking-[0.35em] mb-6 md:mb-10">
          🎯 Tocca a
        </p>
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt=""
            className="w-40 h-40 md:w-56 md:h-56 rounded-full object-cover mx-auto mb-8 border-4 border-gold shadow-2xl"
          />
        ) : (
          <div className="text-[7rem] md:text-[11rem] leading-none mb-4 animate-float-slow">
            {player.emoji || "🎮"}
          </div>
        )}
        <h1 className="text-6xl md:text-8xl font-extrabold leading-none mb-8 break-words">
          {player.nickname}
        </h1>
        <p className="text-4xl md:text-6xl font-black text-accent uppercase tracking-wide animate-pulse">
          Tocca a te!
        </p>
      </div>
      <p className="absolute bottom-8 text-sm text-muted">tocca per continuare</p>
    </div>
  );
}
