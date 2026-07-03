"use client";

import { cn } from "@/lib/utils";

export type LogoSize = "sm" | "md" | "lg" | "xl";

export interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const sizeClass: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-2xl md:text-3xl",
  lg: "text-4xl md:text-5xl",
  xl: "text-5xl md:text-7xl",
};

// Wordmark tipografico "SUPER FABRI GAMES NIGHT": oro da insegna, tre righe.
export function Logo({ size = "md", className }: LogoProps) {
  return (
    <div
      className={cn(
        "font-display uppercase leading-[0.95] tracking-[0.06em]",
        sizeClass[size],
        className,
      )}
      aria-label="Super Fabri Games Night"
    >
      <span className="block text-[0.55em] tracking-[0.35em] text-muted">
        Super
      </span>
      <span
        className="block text-gold"
        style={{ textShadow: "0 0 30px rgba(246,198,75,0.45)" }}
      >
        Fabri
      </span>
      <span className="block text-white/90">Games Night</span>
    </div>
  );
}

export default Logo;
