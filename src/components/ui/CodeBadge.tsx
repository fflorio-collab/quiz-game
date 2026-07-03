"use client";

import { cn } from "@/lib/utils";

export interface CodeBadgeProps {
  /** Codice partita (es. "K7X2PQ") */
  code: string;
  /** "giant" = schermo TV (default), "inline" = header/angolo */
  size?: "giant" | "inline";
  className?: string;
}

// Codice partita a caratteri giganti e spaziati, da leggere dal divano.
export function CodeBadge({ code, size = "giant", className }: CodeBadgeProps) {
  if (size === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5",
          "font-display text-lg uppercase tracking-[0.3em] text-gold tabular-nums",
          className,
        )}
      >
        {code}
      </span>
    );
  }
  return (
    <div className={cn("code-giant select-all text-center", className)}>
      {code}
    </div>
  );
}

export default CodeBadge;
