"use client";

import { cn } from "@/lib/utils";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Etichetta accessibile (default "Caricamento…") */
  label?: string;
  className?: string;
}

const sizeClass: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-14 w-14 border-4",
};

export function Spinner({ size = "md", label = "Caricamento…", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-gold/25 border-t-gold",
        sizeClass[size],
        className,
      )}
    />
  );
}

export default Spinner;
