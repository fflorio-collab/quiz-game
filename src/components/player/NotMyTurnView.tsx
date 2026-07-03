"use client";

import type { QuestionData } from "@/types/game";
import { Chip } from "@/components/ui";

interface Props {
  question: QuestionData;
  /** Secondi rimanenti (null = senza timer) */
  remaining: number | null;
}

// Modalità a turni: non è il turno di questo giocatore. Vede la domanda ma non
// può rispondere (i controlli risposta sono nascosti).
export default function NotMyTurnView({ question, remaining }: Props) {
  const turnName = question.turnPlayerNickname ?? "un altro giocatore";
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="flex items-center gap-2">
        <Chip tone="gold">
          {question.questionNumber}/{question.totalQuestions}
        </Chip>
        {remaining !== null && question.timeLimit > 0 && (
          <Chip tone={remaining <= 5 ? "lose" : "neutral"}>{Math.max(0, remaining)}s</Chip>
        )}
      </div>

      <div className="animate-fade-in flex flex-col items-center gap-3">
        <div className="grid h-24 w-24 place-items-center rounded-full border border-line bg-panel text-5xl">
          ⏳
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted">Tocca a</p>
        <h1 className="font-display text-3xl uppercase tracking-wide text-gold">{turnName}</h1>
      </div>

      <p className="max-w-sm text-balance text-lg leading-snug text-white/90">
        {question.text}
      </p>
      <p className="text-sm text-muted/80">Preparati: il tuo turno potrebbe essere il prossimo.</p>
    </div>
  );
}
