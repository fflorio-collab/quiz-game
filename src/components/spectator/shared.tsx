"use client";

// Costanti e piccoli blocchi condivisi tra le viste della vista TV spettatore.
// Nessuna interazione: sola lettura, tipografia grande, leggibile da lontano.

import type { ReactNode } from "react";
import type { Difficulty, QuestionTypeId } from "@/types/game";
import { cn } from "@/lib/utils";

export const MEDALS = ["🥇", "🥈", "🥉"] as const;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Facile",
  MEDIUM: "Medio",
  HARD: "Difficile",
};

export const DIFFICULTY_TONE: Record<Difficulty, "win" | "gold" | "lose"> = {
  EASY: "win",
  MEDIUM: "gold",
  HARD: "lose",
};

export const QUESTION_TYPE_LABEL: Record<QuestionTypeId, string> = {
  MULTIPLE_CHOICE: "Risposta multipla",
  OPEN_ANSWER: "Risposta aperta",
  IMAGE_GUESS: "Indovina dall'immagine",
};

// Etichette A/B/C/D per le risposte a scelta multipla.
export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

// Schermata neutra tra una fase e l'altra (attesa, giudizio risposte aperte…).
export function Interstitial({
  title,
  subtitle,
  icon = "✨",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 animate-pulse text-6xl md:text-7xl">{icon}</div>
      <h2 className="tv-title text-4xl md:text-6xl">{title}</h2>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-lg text-muted md:text-2xl">{subtitle}</p>
      )}
    </div>
  );
}

// Pill "In diretta" pulsante, usata nell'header del palco.
export function LivePill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted",
        className,
      )}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-lose" />
      In diretta
    </span>
  );
}
