"use client";

import MediaDisplay from "@/components/MediaDisplay";
import { Button, Chip } from "@/components/ui";
import { TimerRing } from "./TimerRing";
import { cn } from "@/lib/utils";
import type { LocalRoundState, PlayerInfo, QuestionData } from "@/types/game";

export interface LocalPartyViewProps {
  question: QuestionData;
  players: PlayerInfo[];
  localState: LocalRoundState | null;
  correctAnswerText: string | null;
  remaining: number | null;
  ending: boolean;
  onSetTurn: (playerId: string | null) => void;
  onJudge: (playerId: string, isCorrect: boolean) => void;
  onEnd: () => void;
}

// Modalità presentatore: l'host legge la domanda, evidenzia chi risponde e
// giudica a voce ✓/✗. La soluzione è visibile solo qui (canale host).
export function LocalPartyView({
  question,
  players,
  localState,
  correctAnswerText,
  remaining,
  ending,
  onSetTurn,
  onJudge,
  onEnd,
}: LocalPartyViewProps) {
  const judgments = localState?.judgments ?? {};
  const activeId = localState?.activePlayerId ?? null;
  const active = players.filter((p) => !p.eliminated);

  return (
    <div className="mx-auto grid min-h-[92vh] max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Domanda + soluzione host */}
      <div className="flex flex-col justify-center gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {question.category && (
            <Chip tone="spark">
              {question.category.icon ?? "🏷️"} {question.category.name}
            </Chip>
          )}
          <Chip tone="gold">
            Domanda {question.questionNumber}/{question.totalQuestions}
          </Chip>
        </div>

        <h1 className="tv-title" style={{ fontSize: "clamp(1.8rem, 3.5vw, 3.5rem)" }}>
          {question.text}
        </h1>

        {question.imageUrl && (
          <MediaDisplay
            imageUrl={question.imageUrl}
            mediaType={question.mediaType}
            audioOnly={question.mediaAudioOnly}
            maxDuration={question.mediaMaxDuration}
            className="max-h-[30vh] w-auto"
          />
        )}

        {correctAnswerText && (
          <div className="rounded-2xl border-2 border-win/40 bg-win/10 p-4">
            <p className="text-xs uppercase tracking-widest text-muted">Soluzione (solo tu)</p>
            <p className="font-display text-3xl text-win">{correctAnswerText}</p>
          </div>
        )}

        <div className="flex items-center gap-6">
          <TimerRing remaining={remaining} total={question.timeLimit} size={120} />
          <Button size="lg" variant="danger" onClick={onEnd} loading={ending}>
            Termina domanda
          </Button>
        </div>
      </div>

      {/* Giocatori: evidenzia turno + giudica */}
      <div className="flex flex-col">
        <h2 className="mb-4 font-display text-2xl uppercase tracking-wide text-white">
          Giocatori
        </h2>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {active.map((p) => {
            const verdict = judgments[p.id]; // true | false | null/undefined
            const isActive = p.id === activeId;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all",
                  isActive ? "border-gold/60 bg-gold/10 shadow-glow" : "border-line bg-panel",
                )}
              >
                <button
                  onClick={() => onSetTurn(isActive ? null : p.id)}
                  className="text-2xl"
                  aria-label="Evidenzia turno"
                  title="Tocca a lui"
                >
                  🎯
                </button>
                {p.emoji && <span className="text-2xl">{p.emoji}</span>}
                <span className="flex-1 truncate font-semibold text-white">{p.nickname}</span>
                <span className="font-display text-xl text-gold tabular-nums">{p.score}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onJudge(p.id, true)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl transition-all",
                      verdict === true
                        ? "border-win bg-win/20 text-win"
                        : "border-line text-muted hover:border-win/50",
                    )}
                    aria-label="Corretto"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => onJudge(p.id, false)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl transition-all",
                      verdict === false
                        ? "border-lose bg-lose/20 text-lose"
                        : "border-line text-muted hover:border-lose/50",
                    )}
                    aria-label="Sbagliato"
                  >
                    ✗
                  </button>
                </div>
              </div>
            );
          })}
          {active.length === 0 && (
            <p className="py-10 text-center text-muted">Nessun giocatore attivo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LocalPartyView;
