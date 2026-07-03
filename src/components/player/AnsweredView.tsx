"use client";

import type { QuestionData } from "@/types/game";

interface Props {
  question: QuestionData;
  nickname: string;
  emoji: string | null;
}

// Dopo l'invio: conferma e attesa degli altri. Nessun modo per rispondere di nuovo.
export default function AnsweredView({ question, nickname, emoji }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="animate-score-pop grid h-28 w-28 place-items-center rounded-full border border-win/40 bg-win/10 text-6xl text-win shadow-glow">
        ✓
      </div>
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl uppercase tracking-wide text-white">
          Risposta inviata
        </h1>
        <p className="mt-2 text-lg text-muted">Aspetta gli altri giocatori…</p>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2">
        <span className="text-2xl">{emoji ?? "🎮"}</span>
        <span className="font-semibold text-white">{nickname}</span>
      </div>

      <p className="max-w-xs text-sm leading-snug text-muted/80">{question.text}</p>
    </div>
  );
}
