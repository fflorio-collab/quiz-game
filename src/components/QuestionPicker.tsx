"use client";

import { useEffect, useState, useCallback } from "react";

type PickerItem = {
  id: string;
  text: string;
  type: string;
  difficulty: string;
  category: { name: string; icon: string | null; color: string | null };
  answersCount: number;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  initialSelected?: string[];
  totalNeeded: number; // quante domande servono (es. totalQuestions)
  type: string;
  difficulty?: string;
  categoryIds?: string[]; // pre-filtro (categorie già scelte a livello globale / round)
  title?: string;
}

/**
 * Modal full-screen per la selezione manuale di domande specifiche.
 * L'host vede tutte le domande che matchano i filtri e spunta quelle da includere.
 */
export default function QuestionPicker({
  isOpen, onClose, onConfirm, initialSelected = [], totalNeeded, type, difficulty, categoryIds = [], title,
}: Props) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", type);
    if (difficulty && difficulty !== "ALL") params.set("difficulty", difficulty);
    if (categoryIds.length > 0) params.set("categoryIds", categoryIds.join(","));
    if (search.trim()) params.set("search", search.trim());
    params.set("limit", "200");
    try {
      const res = await fetch(`/api/questions/search?${params.toString()}`);
      if (!res.ok) throw new Error("fetch fail");
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [type, difficulty, categoryIds, search]);

  useEffect(() => {
    if (!isOpen) return;
    fetchItems();
  }, [isOpen, fetchItems]);

  useEffect(() => {
    if (isOpen) setSelected(new Set(initialSelected));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const it of items) next.add(it.id);
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const canConfirm = selected.size === totalNeeded;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">{title ?? "Scegli le domande"}</h2>
            <p className="text-xs text-muted">
              Servono <b>{totalNeeded}</b> · selezionate <b className={canConfirm ? "text-success" : selected.size > totalNeeded ? "text-danger" : "text-accent"}>{selected.size}</b> · risultati {total}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-2xl leading-none">✕</button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca nel testo della domanda..."
            className="input flex-1"
          />
          <button onClick={selectAllVisible} className="btn-secondary text-sm whitespace-nowrap">Seleziona visibili</button>
          <button onClick={clearAll} className="btn-secondary text-sm whitespace-nowrap">Pulisci</button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {loading ? (
            <p className="text-center text-muted py-8">Caricamento...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted py-8">Nessuna domanda trovata con questi filtri.</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((q) => {
                const isSelected = selected.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => toggle(q.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected ? "border-accent bg-accent/10" : "border-border hover:border-muted"
                    }`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center rounded border-2 text-xs flex-shrink-0 ${isSelected ? "bg-accent border-accent text-background" : "border-border"}`}>
                      {isSelected ? "✓" : ""}
                    </span>
                    <span className="text-lg">{q.category.icon ?? "🏷️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isSelected ? "text-white" : "text-muted"}`}>{q.text}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {q.category.name} · {q.difficulty} · {q.answersCount} opzioni
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button onClick={onClose} className="btn-secondary flex-1">Annulla</button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={!canConfirm}
            className="btn-primary flex-1"
          >
            {canConfirm ? `Conferma ${selected.size} domande` : selected.size > totalNeeded ? `Troppe (max ${totalNeeded})` : `Mancano ${totalNeeded - selected.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}
