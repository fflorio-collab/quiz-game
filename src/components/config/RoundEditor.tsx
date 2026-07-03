"use client";

import { useEffect, useState } from "react";
import QuestionPicker from "@/components/QuestionPicker";
import { Card, Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ACTIVE_TYPES, TIME_OPTIONS, type CatNode, type PackOption, type RoundDraft, type SourceMode } from "./types";
import { CategoryTreePicker } from "./CategoryTreePicker";
import type { DifficultyFilter } from "@/types/game";

export interface RoundEditorProps {
  index: number;
  round: RoundDraft;
  showRemove: boolean;
  questionsPerRound: number;
  difficulty: DifficultyFilter;
  categoryTree: CatNode[];
  /** null se l'host non è admin (pack non disponibili) */
  packs: PackOption[] | null;
  onChange: (r: RoundDraft) => void;
  onRemove: () => void;
}

// Editor di un singolo round: tipo, tempo, punti, sorgente domande, opzioni.
export function RoundEditor({
  index,
  round,
  showRemove,
  questionsPerRound,
  difficulty,
  categoryTree,
  packs,
  onChange,
  onRemove,
}: RoundEditorProps) {
  const [available, setAvailable] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const patch = (p: Partial<RoundDraft>) => onChange({ ...round, ...p });

  // Conteggio domande disponibili con i filtri correnti.
  useEffect(() => {
    let cancelled = false;
    if (round.sourceMode === "manual") {
      setAvailable(round.manualQuestionIds.length);
      return;
    }
    if (round.sourceMode === "pack") {
      const total = (packs ?? [])
        .filter((p) => round.packIds.includes(p.id))
        .reduce((s, p) => s + p.count, 0);
      setAvailable(total);
      return;
    }
    // categories (o pool globale se nessuna categoria)
    setAvailable(null);
    const params = new URLSearchParams({ type: round.type, limit: "1" });
    if (difficulty !== "ALL") params.set("difficulty", difficulty);
    if (round.categoryIds.length > 0) params.set("categoryIds", round.categoryIds.join(","));
    fetch(`/api/questions/search?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAvailable(typeof d.total === "number" ? d.total : 0);
      })
      .catch(() => {
        if (!cancelled) setAvailable(0);
      });
    return () => {
      cancelled = true;
    };
  }, [round.type, round.sourceMode, round.categoryIds, round.manualQuestionIds.length, round.packIds, difficulty, packs]);

  const enough = available === null ? true : available >= questionsPerRound;
  const isOpenAnswer = round.type === "OPEN_ANSWER";

  const setType = (type: RoundDraft["type"]) => {
    // Jeopardy è solo OPEN_ANSWER: cambiando tipo lo azzero.
    patch({ type, jeopardy: type === "OPEN_ANSWER" ? round.jeopardy : false });
  };

  const setSource = (sourceMode: SourceMode) => patch({ sourceMode });

  const sourceTabs: Array<{ id: SourceMode; label: string; hidden?: boolean }> = [
    { id: "categories", label: "Categorie" },
    { id: "pack", label: "Pack", hidden: packs === null },
    { id: "manual", label: "Scelta manuale" },
  ];

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl uppercase tracking-wide text-gold">
          Round {index + 1}
        </h3>
        <div className="flex items-center gap-2">
          <Chip tone={enough ? "win" : "lose"}>
            {available === null ? "…" : `${available} disp.`} / {questionsPerRound}
          </Chip>
          {showRemove && (
            <button
              onClick={onRemove}
              className="text-muted transition-colors hover:text-lose"
              aria-label="Rimuovi round"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tipo domanda */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted">Tipo di domanda</p>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all",
                round.type === t.id ? "border-gold bg-gold/10" : "border-line hover:border-white/30",
              )}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-medium text-white">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tempo + punti */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Tempo</p>
          <select
            className="input"
            value={round.timeLimit}
            onChange={(e) => patch({ timeLimit: Number(e.target.value) })}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t === 0 ? "∞ senza limite" : `${t}s`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Punti corretta</p>
          <input
            type="number"
            className="input"
            value={round.pointsExact}
            min={0}
            onChange={(e) => patch({ pointsExact: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Punti sbagliata</p>
          <input
            type="number"
            className="input"
            value={round.pointsWrong}
            onChange={(e) => patch({ pointsWrong: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Sorgente domande */}
      <div>
        <p className="mb-2 text-sm font-medium text-muted">Sorgente domande</p>
        <div className="mb-3 flex gap-2">
          {sourceTabs
            .filter((s) => !s.hidden)
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setSource(s.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  round.sourceMode === s.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-line text-muted hover:text-white",
                )}
              >
                {s.label}
              </button>
            ))}
        </div>

        {round.sourceMode === "categories" && (
          <CategoryTreePicker
            tree={categoryTree}
            selected={round.categoryIds}
            onChange={(ids) => patch({ categoryIds: ids })}
          />
        )}

        {round.sourceMode === "pack" && packs && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {packs.length === 0 && <p className="text-sm text-muted">Nessun pack disponibile.</p>}
            {packs.map((p) => {
              const on = round.packIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    patch({
                      packIds: on
                        ? round.packIds.filter((x) => x !== p.id)
                        : [...round.packIds, p.id],
                    })
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
                    on ? "border-gold bg-gold/10" : "border-line hover:border-white/30",
                  )}
                >
                  <span className="text-xl">{p.icon ?? "📦"}</span>
                  <span className="flex-1 truncate text-sm text-white">{p.name}</span>
                  <span className="text-xs text-muted">{p.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {round.sourceMode === "manual" && (
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-sm" onClick={() => setPickerOpen(true)}>
              Scegli domande
            </button>
            <span className={cn("text-sm", enough ? "text-win" : "text-muted")}>
              {round.manualQuestionIds.length} / {questionsPerRound} selezionate
            </span>
          </div>
        )}
      </div>

      {/* Opzioni di gioco del round */}
      <div className="flex flex-wrap gap-2">
        <ToggleChip
          active={round.categoryPick}
          onClick={() => patch({ categoryPick: !round.categoryPick, jeopardy: false })}
        >
          🎯 Scegli categoria
        </ToggleChip>
        {isOpenAnswer && (
          <ToggleChip
            active={round.jeopardy}
            onClick={() => patch({ jeopardy: !round.jeopardy, categoryPick: false })}
          >
            🎲 Jeopardy
          </ToggleChip>
        )}
      </div>

      <QuestionPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(ids) => {
          patch({ manualQuestionIds: ids });
          setPickerOpen(false);
        }}
        initialSelected={round.manualQuestionIds}
        totalNeeded={questionsPerRound}
        type={round.type}
        difficulty={difficulty === "ALL" ? undefined : difficulty}
        categoryIds={round.categoryIds}
        title={`Round ${index + 1} · scegli ${questionsPerRound} domande`}
      />
    </Card>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all",
        active ? "border-gold bg-gold/15 text-gold" : "border-line text-muted hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

export default RoundEditor;
