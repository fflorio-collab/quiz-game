"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "gold" | "spark" | "win" | "lose" | "ember" | "neutral";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
}

const toneClass: Record<ChipTone, string> = {
  gold: "text-gold bg-gold/10 border-gold/30",
  spark: "text-spark bg-spark/10 border-spark/30",
  win: "text-win bg-win/10 border-win/30",
  lose: "text-lose bg-lose/10 border-lose/30",
  ember: "text-ember bg-ember/10 border-ember/30",
  neutral: "text-muted bg-white/5 border-white/15",
};

export function Chip({ tone = "neutral", className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        toneClass[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Chip;
