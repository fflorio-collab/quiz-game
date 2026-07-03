"use client";

// Fase JEOPARDY sulla TV: tabellone categoria × valore. Le celle già giocate
// sono spente. Sola lettura.

import type { JeopardyGridData } from "@/types/game";
import { cn } from "@/lib/utils";

export interface JeopardyViewProps {
  grid: JeopardyGridData;
}

export function JeopardyView({ grid }: JeopardyViewProps) {
  // Colonne = categorie (ordine di prima apparizione); righe = valori crescenti.
  const categories: Array<{ id: string; name: string; color: string | null }> = [];
  const values = new Set<number>();
  for (const cell of grid.cells) {
    if (!categories.some((c) => c.id === cell.categoryId)) {
      categories.push({ id: cell.categoryId, name: cell.categoryName, color: cell.categoryColor ?? null });
    }
    values.add(cell.value);
  }
  const sortedValues = [...values].sort((a, b) => a - b);
  const cellAt = (catId: string, value: number) =>
    grid.cells.find((c) => c.categoryId === catId && c.value === value);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="tv-title mb-6 !text-left text-4xl md:text-6xl">Tabellone</h1>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <div
          className="grid min-w-[640px] gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, categories.length)}, minmax(0, 1fr))` }}
        >
          {/* Intestazioni categorie */}
          {categories.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-line bg-panel px-2 py-3 text-center font-display text-sm uppercase tracking-wide"
              style={c.color ? { borderColor: `${c.color}66` } : undefined}
            >
              <span className="line-clamp-2">{c.name}</span>
            </div>
          ))}

          {/* Celle valore */}
          {sortedValues.map((value) =>
            categories.map((c) => {
              const cell = cellAt(c.id, value);
              return (
                <div
                  key={`${c.id}-${value}`}
                  className={cn(
                    "flex aspect-[4/3] items-center justify-center rounded-xl border font-display text-3xl tabular-nums md:text-4xl",
                    !cell
                      ? "border-transparent bg-transparent"
                      : cell.consumed
                        ? "border-line bg-white/[0.02] text-muted/30"
                        : "border-gold/30 bg-gold/10 text-gold shadow-glow",
                  )}
                >
                  {cell ? (cell.consumed ? "—" : cell.value) : ""}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

export default JeopardyView;
