"use client";

import { useEffect, useState } from "react";
import type { QuestionData } from "@/types/game";
import { Chip } from "@/components/ui";
import MediaDisplay from "@/components/MediaDisplay";

// Colori risposta A/B/C/D (token tailwind answerA..D) + lettera.
const TILE = [
  { bg: "bg-answerA", letter: "A" },
  { bg: "bg-answerB", letter: "B" },
  { bg: "bg-answerC", letter: "C" },
  { bg: "bg-answerD", letter: "D" },
];

interface Props {
  question: QuestionData;
  /** Secondi rimanenti (null = nessun timer / senza limite) */
  remaining: number | null;
  /** Vero se il giocatore può rispondere adesso (turno suo o free-for-all) */
  canAnswer: boolean;
  submitting: boolean;
  onAnswer: (payload: { answerId?: string; answerText?: string }) => void;
}

function Countdown({ remaining, timeLimit }: { remaining: number | null; timeLimit: number }) {
  if (timeLimit <= 0) {
    return <span className="font-display text-2xl text-muted">∞</span>;
  }
  const value = remaining ?? timeLimit;
  const panic = value <= 5;
  return (
    <span
      className={
        "font-display text-3xl tabular-nums " +
        (panic ? "animate-timer-panic text-lose" : "text-white")
      }
    >
      {Math.max(0, value)}
    </span>
  );
}

export default function QuestionView({
  question,
  remaining,
  canAnswer,
  submitting,
  onAnswer,
}: Props) {
  const [text, setText] = useState("");
  const [tapped, setTapped] = useState<string | null>(null);

  // Reset dello stato locale quando cambia la domanda.
  useEffect(() => {
    setText("");
    setTapped(null);
  }, [question.gameQuestionId]);

  const isMultiple = question.questionType === "MULTIPLE_CHOICE";
  const disabled = !canAnswer || submitting;

  const handleTile = (id: string) => {
    if (disabled || tapped) return;
    setTapped(id);
    onAnswer({ answerId: id });
  };

  const handleText = () => {
    const value = text.trim();
    if (disabled || !value) return;
    onAnswer({ answerText: value });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col px-4 pb-6 pt-4">
      {/* Header: progresso + timer */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="gold">
            {question.questionNumber}/{question.totalQuestions}
          </Chip>
          {question.category && (
            <Chip tone="neutral">
              {question.category.icon ? `${question.category.icon} ` : ""}
              {question.category.name}
            </Chip>
          )}
          <Chip tone="spark">{question.points} pt</Chip>
        </div>
        <Countdown remaining={remaining} timeLimit={question.timeLimit} />
      </div>

      {/* Media */}
      {question.imageUrl && (
        <div className="mb-3">
          <MediaDisplay
            imageUrl={question.imageUrl}
            mediaType={question.mediaType}
            audioOnly={question.mediaAudioOnly}
            maxDuration={question.mediaMaxDuration}
            className="max-h-56 w-full"
          />
        </div>
      )}

      {/* Testo domanda */}
      <h1 className="mb-4 text-balance text-2xl font-semibold leading-snug text-white">
        {question.text}
      </h1>

      {isMultiple ? (
        <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
          {question.answers.map((a, i) => {
            const t = TILE[i] ?? TILE[0];
            const isTapped = tapped === a.id;
            return (
              <button
                key={a.id}
                type="button"
                disabled={disabled || tapped !== null}
                onClick={() => handleTile(a.id)}
                className={
                  "answer-tile flex min-h-[76px] items-center gap-3 text-white transition-transform active:scale-[0.97] " +
                  t.bg +
                  " " +
                  (isTapped ? "ring-4 ring-white/80 scale-[0.98]" : "") +
                  (tapped && !isTapped ? " opacity-40" : "")
                }
                style={{ border: "none" }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/25 font-display text-lg">
                  {t.letter}
                </span>
                <span className="text-lg font-semibold leading-tight">{a.text}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-auto flex flex-col gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleText();
            }}
            disabled={disabled}
            autoFocus
            enterKeyHint="send"
            placeholder="Scrivi la tua risposta…"
            className="input min-h-[64px] text-center text-xl"
          />
          <button
            type="button"
            disabled={disabled || text.trim().length === 0}
            onClick={handleText}
            className="btn-primary min-h-[64px] w-full text-xl"
          >
            {submitting ? "Invio…" : "Invia risposta"}
          </button>
        </div>
      )}
    </div>
  );
}
