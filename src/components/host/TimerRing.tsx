"use client";

import { cn } from "@/lib/utils";

export interface TimerRingProps {
  /** Secondi rimanenti. null = nessuna domanda a tempo (∞) */
  remaining: number | null;
  /** Secondi totali della domanda. 0/undefined = senza limite */
  total?: number;
  size?: number;
  className?: string;
}

// Anello di countdown per proiettore: numero gigante al centro + arco che si
// svuota. Sotto i 5 secondi entra in "panic" (rosso pulsante).
export function TimerRing({ remaining, total = 0, size = 220, className }: TimerRingProps) {
  const noLimit = total <= 0 || remaining === null;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = noLimit ? 1 : Math.max(0, Math.min(1, remaining! / total));
  const dash = c * frac;
  const panic = !noLimit && remaining !== null && remaining <= 5;
  const color = noLimit ? "#f6c64b" : panic ? "#ff5c5c" : remaining! <= total * 0.35 ? "#ff8a3c" : "#f6c64b";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        {!noLimit && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - dash}
            style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {noLimit ? (
          <span className="font-display text-6xl text-gold">∞</span>
        ) : (
          <span
            className={cn(
              "font-display tabular-nums leading-none",
              panic && "animate-timer-panic",
            )}
            style={{ fontSize: size * 0.42, color }}
          >
            {Math.max(0, remaining!)}
          </span>
        )}
      </div>
    </div>
  );
}

export default TimerRing;
