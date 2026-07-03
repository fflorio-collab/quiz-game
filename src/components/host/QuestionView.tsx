"use client";

import MediaDisplay from "@/components/MediaDisplay";
import { Button, Chip } from "@/components/ui";
import { TimerRing } from "./TimerRing";
import { cn } from "@/lib/utils";
import type { QuestionData } from "@/types/game";

export interface QuestionViewProps {
  question: QuestionData;
  remaining: number | null;
  answered: number;
  total: number;
  ending: boolean;
  onEnd: () => void;
}

const ANSWER_TONE = ["bg-answerA/15 border-answerA/50", "bg-answerB/15 border-answerB/50", "bg-answerC/15 border-answerC/50", "bg-answerD/15 border-answerD/50"];
const ANSWER_LETTER = ["A", "B", "C", "D"];

// Schermata domanda su proiettore: testo grande, media, timer, contatore risposte.
export function QuestionView({ question, remaining, answered, total, ending, onEnd }: QuestionViewProps) {
  const isChoice = question.questionType === "MULTIPLE_CHOICE" && question.answers.length > 0;
  const hasMedia = !!question.imageUrl;

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {question.category && (
            <Chip tone="spark">
              {question.category.icon ?? "🏷️"} {question.category.name}
            </Chip>
          )}
          {question.difficulty && <Chip tone="ember">{question.difficulty}</Chip>}
          <Chip tone="gold">
            Domanda {question.questionNumber}/{question.totalQuestions}
          </Chip>
        </div>
        {question.turnPlayerNickname && (
          <Chip tone="gold" className="text-sm">
            🎯 Tocca a {question.turnPlayerNickname}
          </Chip>
        )}
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <h1 className="tv-title max-w-5xl text-center" style={{ fontSize: "clamp(2rem, 4.5vw, 4.5rem)" }}>
          {question.text}
        </h1>

        {hasMedia && (
          <MediaDisplay
            imageUrl={question.imageUrl!}
            mediaType={question.mediaType}
            audioOnly={question.mediaAudioOnly}
            maxDuration={question.mediaMaxDuration}
            className="max-h-[38vh] w-auto"
          />
        )}

        {isChoice && (
          <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {question.answers.map((a, i) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border-2 p-5 text-left",
                  ANSWER_TONE[i % 4],
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 font-display text-2xl text-white">
                  {ANSWER_LETTER[i]}
                </span>
                <span className="text-2xl font-semibold text-white">{a.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: timer + risposte + controlli */}
      <div className="mt-6 flex items-center justify-between gap-6">
        <TimerRing remaining={remaining} total={question.timeLimit} size={140} />
        <div className="text-center">
          <p className="font-display text-6xl text-white tabular-nums">
            {answered}
            <span className="text-muted">/{total}</span>
          </p>
          <p className="text-sm uppercase tracking-widest text-muted">risposte</p>
        </div>
        <Button size="xl" variant="danger" onClick={onEnd} loading={ending}>
          Termina domanda
        </Button>
      </div>
    </div>
  );
}

export default QuestionView;
