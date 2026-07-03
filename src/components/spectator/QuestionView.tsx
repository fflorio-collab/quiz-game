"use client";

// Fase QUESTION sulla TV: domanda enorme, media, timer, risposte MOSTRATE ma
// SENZA evidenziare la corretta, contatore di quanti hanno già risposto.

import type { QuestionData } from "@/types/game";
import MediaDisplay from "@/components/MediaDisplay";
import { Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_TONE,
  OPTION_LETTERS,
  QUESTION_TYPE_LABEL,
} from "./shared";

const OPTION_ACCENT = [
  "border-answerA/60 text-answerA",
  "border-answerB/60 text-answerB",
  "border-answerC/60 text-answerC",
  "border-answerD/60 text-answerD",
];

export interface QuestionViewProps {
  question: QuestionData;
  /** Secondi rimanenti (dal tick locale). null = nessun limite / non pervenuto */
  remaining: number | null;
  answeredCount: number;
  totalPlayers: number;
}

export function QuestionView({ question, remaining, answeredCount, totalPlayers }: QuestionViewProps) {
  const noLimit = question.timeLimit === 0;
  const secs = remaining ?? (noLimit ? null : question.timeLimit);
  const panic = secs !== null && secs <= 5 && secs > 0;
  const isMultiple = question.questionType === "MULTIPLE_CHOICE" && question.answers.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Barra info */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {question.category && (
          <Chip tone="spark">
            {question.category.icon ? `${question.category.icon} ` : ""}
            {question.category.name}
          </Chip>
        )}
        <Chip tone={DIFFICULTY_TONE[question.difficulty]}>
          {DIFFICULTY_LABEL[question.difficulty]}
        </Chip>
        <Chip tone="gold">{question.points} punti</Chip>
        <span className="ml-auto text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Domanda {question.questionNumber}/{question.totalQuestions}
        </span>
      </div>

      {/* Turno (modalità a turni) */}
      {question.turnPlayerNickname && (
        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-gold">
          <span className="text-lg">🎯</span>
          <span className="font-semibold">Tocca a {question.turnPlayerNickname}</span>
        </div>
      )}

      {/* Timer + contatore risposte */}
      <div className="mb-6 flex items-center justify-between gap-6">
        <div
          className={cn(
            "font-display text-6xl tabular-nums md:text-7xl",
            panic ? "animate-timer-panic" : "text-gold",
          )}
        >
          {secs === null ? "∞" : secs}
          {secs !== null && <span className="ml-2 text-2xl text-muted md:text-3xl">s</span>}
        </div>
        <div className="text-right">
          <div className="font-display text-3xl tabular-nums text-white md:text-4xl">
            {answeredCount}
            <span className="text-muted">/{totalPlayers}</span>
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted">Risposte</div>
        </div>
      </div>

      {/* Domanda */}
      <h1 className="tv-title mb-6 !text-left text-4xl md:text-6xl">{question.text}</h1>

      {/* Media */}
      {question.imageUrl && (
        <div className="mb-6 max-h-[42vh] overflow-hidden">
          <MediaDisplay
            imageUrl={question.imageUrl}
            mediaType={question.mediaType}
            audioOnly={question.mediaAudioOnly}
            maxDuration={question.mediaMaxDuration}
            className="max-h-[42vh]"
          />
        </div>
      )}

      {/* Risposte */}
      {isMultiple ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {question.answers.map((a, i) => (
            <div
              key={a.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-5 text-xl font-semibold md:text-2xl"
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 font-display",
                  OPTION_ACCENT[i] ?? "border-line text-muted",
                )}
              >
                {OPTION_LETTERS[i]}
              </span>
              <span className="min-w-0">{a.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-white/[0.02] p-6 text-center text-lg text-muted">
          {QUESTION_TYPE_LABEL[question.questionType]} — rispondi dal tuo dispositivo
        </div>
      )}
    </div>
  );
}

export default QuestionView;
