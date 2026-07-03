import type { QuestionTypeId } from "@/types/game";

// Nodo dell'albero categorie restituito da GET /api/categories (campo `tree`).
export interface CatNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  count: number;      // domande direttamente in questa categoria
  totalCount: number; // domande qui + in tutte le discendenti
  children: CatNode[];
}

// Pack curato (GET /api/admin/packs) — disponibile solo se l'host è admin.
export interface PackOption {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  count: number;
}

export type SourceMode = "categories" | "pack" | "manual";

// Bozza di round lato client. Mappata su RoundConfig (@/types/game) al submit.
export interface RoundDraft {
  id: string;
  type: QuestionTypeId;
  timeLimit: number; // secondi; 0 = senza limite (∞)
  pointsExact: number;
  pointsWrong: number;
  sourceMode: SourceMode;
  categoryIds: string[];
  packIds: string[];
  manualQuestionIds: string[];
  categoryPick: boolean;
  jeopardy: boolean;
}

let seq = 0;
export function newRound(type: QuestionTypeId = "MULTIPLE_CHOICE"): RoundDraft {
  seq += 1;
  return {
    id: `r${Date.now()}_${seq}`,
    type,
    timeLimit: 20,
    pointsExact: 100,
    pointsWrong: 0,
    sourceMode: "categories",
    categoryIds: [],
    packIds: [],
    manualQuestionIds: [],
    categoryPick: false,
    jeopardy: false,
  };
}

// I 3 tipi attivi (contratto: MULTIPLE_CHOICE, OPEN_ANSWER, IMAGE_GUESS).
export const ACTIVE_TYPES: Array<{ id: QuestionTypeId; label: string; icon: string }> = [
  { id: "MULTIPLE_CHOICE", label: "Risposta multipla", icon: "🔤" },
  { id: "OPEN_ANSWER", label: "Risposta aperta", icon: "✏️" },
  { id: "IMAGE_GUESS", label: "Indovina il luogo", icon: "🗺️" },
];

export const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 0]; // 0 = ∞

// Raccoglie ricorsivamente gli id di un sottoalbero (nodo + discendenti).
export function subtreeIds(node: CatNode): string[] {
  const ids = [node.id];
  for (const child of node.children) ids.push(...subtreeIds(child));
  return ids;
}
