"use client";

// Fase CATEGORY_PICK sulla TV: griglia categoria × difficoltà con i punti in
// palio. In modalità a turni mostra "Tocca a {nome}".

import type { CategoryGridData, Difficulty } from "@/types/game";
import { DIFFICULTY_LABEL } from "./shared";

export interface CategoryPickViewProps {
  grid: CategoryGridData;
}

export function CategoryPickView({ grid }: CategoryPickViewProps) {
  const round = grid.roundInfo;
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="tv-title !text-left text-4xl md:text-6xl">Scegli la categoria</h1>
        {round && (
          <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            {round.modeLabel} · Round {round.roundNumber}/{round.totalRounds}
          </span>
        )}
      </div>

      {grid.turnPlayerNickname && (
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-gold">
          <span className="text-xl">🎯</span>
          <span className="text-lg font-semibold">Tocca a {grid.turnPlayerNickname}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {grid.categories.map((c) => (
          <div
            key={c.id}
            className="flex flex-col rounded-2xl border border-line bg-panel p-5"
            style={c.color ? { borderColor: `${c.color}66` } : undefined}
          >
            <div className="mb-3 flex items-center gap-2">
              {c.icon && <span className="text-2xl">{c.icon}</span>}
              <span className="min-w-0 flex-1 truncate font-display text-lg uppercase tracking-wide">
                {c.name}
              </span>
              <span className="shrink-0 text-xs text-muted">{c.remaining} rim.</span>
            </div>

            {c.difficulties && c.difficulties.length > 0 ? (
              <div className="mt-auto flex flex-col gap-2">
                {c.difficulties.map((d) => (
                  <div
                    key={d.difficulty}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <span className="text-sm text-muted">
                      {DIFFICULTY_LABEL[d.difficulty as Difficulty] ?? d.difficulty}
                    </span>
                    <span className="font-display tabular-nums text-gold">{d.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-auto text-sm text-muted">{c.remaining} domande disponibili</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryPickView;
