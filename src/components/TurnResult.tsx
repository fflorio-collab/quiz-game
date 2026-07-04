"use client";

import { useEffect, useRef } from "react";

export type ResultPlayer = {
  nickname: string;
  emoji?: string | null;
  avatarUrl?: string | null;
  correct: boolean;
  points: number; // punti guadagnati (0 se sbagliata)
};

// Overlay a tutto schermo che mostra l'esito del turno appena giudicato:
// ✓ CORRETTA / ✗ SBAGLIATA + i punti (+X oppure 0). Auto-scompare dopo `durationMs`
// o al tocco/click.
export default function TurnResult({
  player,
  onDone,
  durationMs = 2400,
}: {
  player: ResultPlayer;
  onDone: () => void;
  durationMs?: number;
}) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  const ok = player.correct;
  const glow = ok ? "rgba(48,209,88,0.30)" : "rgba(255,69,58,0.28)";

  return (
    <div
      onClick={() => doneRef.current()}
      role="button"
      aria-label={ok ? "Risposta corretta" : "Risposta sbagliata"}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer overflow-hidden animate-fade-in"
      style={{ background: `radial-gradient(circle at 50% 38%, ${glow}, #000 72%)` }}
    >
      <div className="text-center px-6 animate-announce-pop">
        <div className={`text-[7rem] md:text-[10rem] leading-none mb-2 ${ok ? "text-success" : "text-danger"}`}>
          {ok ? "✓" : "✗"}
        </div>
        <p className={`text-3xl md:text-5xl font-black uppercase tracking-wide mb-6 ${ok ? "text-success" : "text-danger"}`}>
          {ok ? "Esatta!" : "Sbagliata"}
        </p>
        <div className="flex items-center justify-center gap-3 mb-6">
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-white/20" />
          ) : (
            <span className="text-5xl md:text-6xl">{player.emoji || "🎮"}</span>
          )}
          <span className="text-4xl md:text-6xl font-extrabold break-words">{player.nickname}</span>
        </div>
        <div className={`text-6xl md:text-8xl font-black tabular-nums ${ok ? "text-success" : "text-muted"}`}>
          {ok ? `+${player.points}` : "0"}
          <span className="text-2xl md:text-3xl font-bold ml-2 text-muted">punti</span>
        </div>
      </div>
      <p className="absolute bottom-8 text-sm text-muted">tocca per continuare</p>
    </div>
  );
}
