"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { JeopardyGridData } from "@/types/game";

export interface JeopardyViewProps {
  grid: JeopardyGridData;
  busy: boolean;
  onPick: (gameQuestionId: string) => void;
}

// Tabellone Jeopardy: colonne = categorie, righe = valori crescenti.
export function JeopardyView({ grid, busy, onPick }: JeopardyViewProps) {
  const { columns, values } = useMemo(() => {
    const cols = new Map<string, { name: string; color: string | null; icon: string | null }>();
    const vals = new Set<number>();
    for (const c of grid.cells) {
      if (!cols.has(c.categoryId)) {
        cols.set(c.categoryId, {
          name: c.categoryName,
          color: c.categoryColor ?? null,
          icon: c.categoryIcon ?? null,
        });
      }
      vals.add(c.value);
    }
    return {
      columns: Array.from(cols.entries()).map(([id, v]) => ({ id, ...v })),
      values: Array.from(vals).sort((a, b) => a - b),
    };
  }, [grid.cells]);

  const cellFor = (categoryId: string, value: number) =>
    grid.cells.find((c) => c.categoryId === categoryId && c.value === value);

  return (
    <div className="mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-center p-6">
      <h1 className="mb-8 text-center tv-title" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
        Rischiatutto
      </h1>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }}
      >
        {/* Intestazioni categorie */}
        {columns.map((col) => (
          <div
            key={col.id}
            className="rounded-2xl border border-line bg-panel px-3 py-4 text-center"
            style={col.color ? { borderColor: `${col.color}55` } : undefined}
          >
            <div className="text-2xl">{col.icon ?? "🏷️"}</div>
            <p className="truncate font-display text-sm uppercase text-white">{col.name}</p>
          </div>
        ))}

        {/* Celle valore */}
        {values.map((value) =>
          columns.map((col) => {
            const cell = cellFor(col.id, value);
            if (!cell) return <div key={`${col.id}-${value}`} />;
            return (
              <button
                key={cell.gameQuestionId}
                disabled={busy || cell.consumed}
                onClick={() => onPick(cell.gameQuestionId)}
                className={cn(
                  "flex aspect-[4/3] items-center justify-center rounded-2xl border-2 font-display text-4xl transition-all",
                  cell.consumed
                    ? "border-line bg-stage/50 text-muted/30"
                    : "border-gold/40 bg-gradient-to-b from-panel to-stage text-gold hover:scale-[1.03] hover:border-gold hover:shadow-glow",
                )}
              >
                {cell.consumed ? "—" : value}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

export default JeopardyView;
