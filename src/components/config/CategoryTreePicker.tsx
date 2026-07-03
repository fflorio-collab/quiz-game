"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { subtreeIds, type CatNode } from "./types";

export interface CategoryTreePickerProps {
  tree: CatNode[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

// Selettore ad albero delle categorie: spuntare un nodo include l'intero
// sottoalbero (root + discendenti), come si aspetta /api/questions/search.
export function CategoryTreePicker({ tree, selected, onChange }: CategoryTreePickerProps) {
  const sel = new Set(selected);

  const toggle = (node: CatNode) => {
    const ids = subtreeIds(node);
    const next = new Set(sel);
    const isOn = ids.every((id) => next.has(id));
    if (isOn) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    onChange(Array.from(next));
  };

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-stage p-2">
      {tree.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Nessuna categoria.</p>
      ) : (
        tree.map((n) => <TreeRow key={n.id} node={n} depth={0} sel={sel} onToggle={toggle} />)
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  sel,
  onToggle,
}: {
  node: CatNode;
  depth: number;
  sel: Set<string>;
  onToggle: (n: CatNode) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const ids = subtreeIds(node);
  const allOn = ids.every((id) => sel.has(id));
  const someOn = !allOn && ids.some((id) => sel.has(id));
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {hasChildren ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-4 text-muted"
            aria-label={open ? "Chiudi" : "Apri"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button onClick={() => onToggle(node)} className="flex flex-1 items-center gap-2 text-left">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded border-2 text-xs",
              allOn
                ? "border-gold bg-gold text-ink"
                : someOn
                  ? "border-gold/60 bg-gold/20 text-gold"
                  : "border-line text-transparent",
            )}
          >
            {allOn ? "✓" : someOn ? "–" : ""}
          </span>
          <span className="text-lg">{node.icon ?? "🏷️"}</span>
          <span className="flex-1 truncate text-sm text-white">{node.name}</span>
          <span className="text-xs text-muted">{node.totalCount}</span>
        </button>
      </div>
      {open &&
        node.children.map((c) => (
          <TreeRow key={c.id} node={c} depth={depth + 1} sel={sel} onToggle={onToggle} />
        ))}
    </div>
  );
}

export default CategoryTreePicker;
