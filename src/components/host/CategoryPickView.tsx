"use client";

import { Chip } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CategoryGridData, Difficulty } from "@/types/game";

export interface CategoryPickViewProps {
  grid: CategoryGridData;
  busy: boolean;
  onPick: (categoryId: string, difficulty?: Difficulty) => void;
}

const DIFF_LABEL: Record<string, string> = { EASY: "Facile", MEDIUM: "Medio", HARD: "Difficile" };
const DIFF_TONE: Record<string, string> = {
  EASY: "border-win/50 hover:bg-win/10",
  MEDIUM: "border-gold/50 hover:bg-gold/10",
  HARD: "border-lose/50 hover:bg-lose/10",
};

// Griglia "Scegli categoria": categoria × difficoltà con i punti in palio.
export function CategoryPickView({ grid, busy, onPick }: CategoryPickViewProps) {
  const info = grid.roundInfo;
  return (
    <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col p-6">
      <div className="mb-8 text-center">
        {info && (
          <Chip tone="spark" className="mb-3">
            Round {info.roundNumber}/{info.totalRounds} · {info.modeLabel}
          </Chip>
        )}
        <h1 className="tv-title" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>
          Scegli la categoria
        </h1>
        {grid.turnPlayerNickname && (
          <p className="mt-3 font-display text-3xl text-gold">
            🎯 Tocca a {grid.turnPlayerNickname}
          </p>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grid.categories.map((cat) => (
          <div
            key={cat.id}
            className={cn(
              "flex flex-col rounded-3xl border-2 bg-panel p-5",
              cat.remaining === 0 ? "opacity-40" : "border-line",
            )}
            style={cat.color ? { borderColor: `${cat.color}55` } : undefined}
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="text-3xl">{cat.icon ?? "🏷️"}</span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl text-white">{cat.name}</p>
                <p className="text-xs text-muted">{cat.remaining} rimaste</p>
              </div>
            </div>

            {cat.difficulties && cat.difficulties.length > 0 ? (
              <div className="mt-auto grid gap-2">
                {cat.difficulties.map((d) => (
                  <button
                    key={d.difficulty}
                    disabled={busy || d.remaining === 0}
                    onClick={() => onPick(cat.id, d.difficulty)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border-2 bg-stage px-4 py-3 transition-all disabled:opacity-30",
                      DIFF_TONE[d.difficulty] ?? "border-line",
                    )}
                  >
                    <span className="font-semibold text-white">
                      {DIFF_LABEL[d.difficulty] ?? d.difficulty}
                    </span>
                    <span className="font-display text-2xl text-gold tabular-nums">
                      {d.points}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                disabled={busy || cat.remaining === 0}
                onClick={() => onPick(cat.id)}
                className="mt-auto rounded-2xl border-2 border-gold/50 bg-stage px-4 py-3 font-semibold text-white transition-all hover:bg-gold/10 disabled:opacity-30"
              >
                Scegli
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryPickView;
