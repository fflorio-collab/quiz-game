"use client";

import { useEffect, useState } from "react";
import { Button, Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { JudgeAnswersData } from "@/types/game";

export interface JudgingViewProps {
  judging: JudgeAnswersData;
  /** Soluzione da mostrare all'host, se disponibile */
  correctAnswerText?: string | null;
  busy: boolean;
  onConfirm: (judgments: Array<{ playerId: string; isCorrect: boolean }>) => void;
}

// Giudizio manuale delle risposte aperte: ✓/✗ per ogni giocatore, poi conferma.
export function JudgingView({ judging, correctAnswerText, busy, onConfirm }: JudgingViewProps) {
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>({});

  // Nuovo set di risposte → reset (default: da giudicare = sbagliato finché non spuntato).
  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const a of judging.answers) init[a.playerId] = false;
    setVerdicts(init);
  }, [judging.gameQuestionId, judging.answers]);

  const set = (playerId: string, isCorrect: boolean) =>
    setVerdicts((v) => ({ ...v, [playerId]: isCorrect }));

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-4xl flex-col p-6">
      <div className="mb-6 text-center">
        <Chip tone="ember">Giudica le risposte</Chip>
        {correctAnswerText && (
          <p className="mt-4 font-display text-3xl text-gold">
            Soluzione: {correctAnswerText}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {judging.answers.length === 0 ? (
          <p className="py-10 text-center text-muted">Nessuna risposta ricevuta.</p>
        ) : (
          judging.answers.map((a) => {
            const verdict = verdicts[a.playerId];
            return (
              <Card key={a.playerId} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-muted">{a.nickname}</p>
                  <p className="truncate text-2xl font-semibold text-white">
                    {a.answerText || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => set(a.playerId, true)}
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-2xl transition-all",
                      verdict === true
                        ? "border-win bg-win/20 text-win"
                        : "border-line text-muted hover:border-win/50",
                    )}
                    aria-label="Corretto"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => set(a.playerId, false)}
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-2xl transition-all",
                      verdict === false
                        ? "border-lose bg-lose/20 text-lose"
                        : "border-line text-muted hover:border-lose/50",
                    )}
                    aria-label="Sbagliato"
                  >
                    ✗
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <Button
          size="xl"
          className="w-full"
          loading={busy}
          onClick={() =>
            onConfirm(
              judging.answers.map((a) => ({
                playerId: a.playerId,
                isCorrect: !!verdicts[a.playerId],
              })),
            )
          }
        >
          Conferma giudizi
        </Button>
      </div>
    </div>
  );
}

export default JudgingView;
