"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/useSocket";
import type { QuestionType, DifficultyFilter } from "@/types/socket";
import { QUESTION_TYPE_LIST, QUESTION_TYPE_META } from "@/lib/questionTypes";
import QuestionPicker from "@/components/QuestionPicker";

type Category = { id: string; name: string; icon?: string | null; color?: string | null; parentId?: string | null; _count?: { questions: number } };
type CategoryTreeNode = {
  id: string; name: string; slug: string; icon: string | null; color: string | null;
  parentId: string | null; count: number; totalCount: number; children: CategoryTreeNode[];
};

const DIFFICULTIES: { value: DifficultyFilter; label: string; icon: string }[] = [
  { value: "ALL",    label: "Tutte",    icon: "🎲" },
  { value: "EASY",   label: "Facile",   icon: "😊" },
  { value: "MEDIUM", label: "Medio",    icon: "🧠" },
  { value: "HARD",   label: "Difficile",icon: "🔥" },
];

export default function HostPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [hostName, setHostName] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [isTournament, setIsTournament] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [tournamentModes, setTournamentModes] = useState<QuestionType[]>(["MULTIPLE_CHOICE", "WORD_COMPLETION"]);
  // Tempo per round (torneo): allineato a tournamentModes. 0 = senza limite.
  const [tournamentTimeLimits, setTournamentTimeLimits] = useState<number[]>([20, 20]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  // Tempo per domanda (non torneo): null=default, 0=senza limite, >0=secondi
  const [timeLimitOverride, setTimeLimitOverride] = useState<number | null>(20);
  // "Ultimo in piedi": rispondi male → eliminato
  const [lastManStanding, setLastManStanding] = useState(false);
  // "Speedrun": timer globale; 0/null = off
  const [speedrunDuration, setSpeedrunDuration] = useState<number | null>(null);
  // "Caduta libera": errori consentiti prima dell'eliminazione; null = off
  const [livesAllowed, setLivesAllowed] = useState<number | null>(null);
  // "Jeopardy": griglia categoria × valore
  const [jeopardyMode, setJeopardyMode] = useState(false);
  // Aiuti: quantità consentite per player (0 = disabilitati)
  const [fiftyFiftyCount, setFiftyFiftyCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  // "Modalità presentatore": niente dispositivi, host legge domande a voce e giudica le risposte
  const [localPartyMode, setLocalPartyMode] = useState(false);
  // Punti per round (allineato a tournamentModes; lunghezza 1 per singola modalità). 0 = default (1000).
  const [pointsOverrides, setPointsOverrides] = useState<number[]>([0]);
  // Categorie per round (torneo): array di categoryId per ogni round; vuoto = usa filtro globale
  const [tournamentCategoryIdsByRound, setTournamentCategoryIdsByRound] = useState<string[][]>([[], []]);
  // "Scegli categoria": prima di ogni domanda l'host sceglie una categoria dalla griglia
  const [categoryPickMode, setCategoryPickMode] = useState(false);
  // Quale round del torneo ha la sezione "Categorie del round" espansa (null = nessuno)
  const [expandedRoundCats, setExpandedRoundCats] = useState<number | null>(null);
  // Selezione manuale delle domande: uno slot per round (singola mod = index 0)
  const [manualQuestionIds, setManualQuestionIds] = useState<string[][]>([[]]);
  const [pickerOpenRound, setPickerOpenRound] = useState<number | null>(null);
  const useManualSelection = manualQuestionIds.some((arr) => arr.length > 0);

  // Filtro categoria
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  // Inventario domande per tipo (somma tutte le difficoltà). Deriva da /api/categories.
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories || []);
        setCategoryTree(d.tree || []);
        const agg: Record<string, number> = {};
        for (const row of (d.counts as { type: string; count: number }[]) ?? []) {
          agg[row.type] = (agg[row.type] ?? 0) + row.count;
        }
        setCountsByType(agg);
      })
      .catch(() => {});
  }, []);

  // Espandi/comprimi una root
  const toggleRoot = (rootId: string) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId); else next.add(rootId);
      return next;
    });
  };

  // Raccoglie ricorsivamente tutti gli id (root + tutte le sub) di un nodo
  const allDescendantIds = (node: CategoryTreeNode): string[] => {
    const ids = [node.id];
    for (const ch of node.children) ids.push(...allDescendantIds(ch));
    return ids;
  };

  // Toggle globale di una root: se tutta selezionata → deselect, altrimenti → select-all discendenti
  const toggleRootSelection = (node: CategoryTreeNode) => {
    const ids = allDescendantIds(node);
    const allSelected = ids.every((id) => selectedCategoryIds.includes(id));
    setSelectedCategoryIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const addTournamentMode = (type: QuestionType) => {
    if (tournamentModes.length >= 8) return;
    setTournamentModes((prev) => [...prev, type]);
    setTournamentTimeLimits((prev) => [...prev, 20]);
    setPointsOverrides((prev) => [...prev, 0]);
    setTournamentCategoryIdsByRound((prev) => [...prev, []]);
    setManualQuestionIds((prev) => [...prev, []]);
  };

  const removeTournamentMode = (index: number) => {
    if (tournamentModes.length <= 2) return;
    setTournamentModes((prev) => prev.filter((_, i) => i !== index));
    setTournamentTimeLimits((prev) => prev.filter((_, i) => i !== index));
    setPointsOverrides((prev) => prev.filter((_, i) => i !== index));
    setTournamentCategoryIdsByRound((prev) => prev.filter((_, i) => i !== index));
    setManualQuestionIds((prev) => prev.filter((_, i) => i !== index));
    setExpandedRoundCats((prev) => (prev === index ? null : prev));
  };

  const moveMode = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= tournamentModes.length) return;
    setTournamentModes((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setTournamentTimeLimits((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setPointsOverrides((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setTournamentCategoryIdsByRound((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setManualQuestionIds((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const setRoundTimeLimit = (index: number, seconds: number) => {
    setTournamentTimeLimits((prev) => prev.map((t, i) => (i === index ? seconds : t)));
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createGame = () => {
    if (!socket) return;
    if (!hostName.trim()) { setError("Inserisci il tuo nome"); return; }
    if (isTournament && tournamentModes.length < 2) { setError("Seleziona almeno 2 modalità per il torneo"); return; }
    setLoading(true);
    setError("");

    socket.emit(
      "host:create",
      {
        hostName: hostName.trim(),
        difficulty,
        totalQuestions,
        questionType: isTournament ? tournamentModes[0] : questionType,
        tournamentModes: isTournament ? tournamentModes : undefined,
        tournamentTimeLimits: isTournament ? tournamentTimeLimits : undefined,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        timeLimitOverride: isTournament ? null : timeLimitOverride,
        lastManStanding,
        speedrunDuration,
        livesAllowed,
        jeopardyMode: isTournament ? false : jeopardyMode,
        fiftyFiftyCount: localPartyMode ? 0 : fiftyFiftyCount,
        skipCount: localPartyMode ? 0 : skipCount,
        localPartyMode,
        pointsOverrides: pointsOverrides,
        tournamentCategoryIds: isTournament ? tournamentCategoryIdsByRound : undefined,
        categoryPickMode: isTournament ? false : categoryPickMode,
        manualQuestionIds: useManualSelection ? manualQuestionIds : undefined,
      },
      (res) => {
        setLoading(false);
        if ("error" in res) { setError(res.error); return; }
        localStorage.setItem("hostGameId", res.gameId);
        localStorage.setItem("hostCode", res.code);
        localStorage.setItem("hostName", hostName.trim());
        router.push(`/host/${res.gameId}`);
      }
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="apple-link text-sm mb-6 inline-flex">
          ‹ Indietro
        </Link>

        <div className="card">
          <div className="chip-gold mb-3">Presentatore</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Accendi la serata.</h1>
          <p className="text-muted mb-6">Configura la tua puntata e lancia il codice sul palco.</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Il tuo nome</label>
              <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)}
                placeholder="Es. Marco" className="input" maxLength={20} />
            </div>

            {/* Modalità presentatore: niente dispositivi, host legge e giudica a voce */}
            <div>
              <button
                type="button"
                onClick={() => setLocalPartyMode(!localPartyMode)}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  localPartyMode ? "border-gold bg-gold/10 text-white" : "border-border text-muted hover:border-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">📣</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Modalità presentatore {localPartyMode && "· attiva"}</div>
                    <div className="text-xs text-muted">
                      Niente dispositivi: leggi le domande a voce, giudichi tu le risposte.
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${localPartyMode ? "bg-gold" : "bg-border"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${localPartyMode ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </div>
              </button>
            </div>

            {/* Formato */}
            <div>
              <label className="block text-sm font-medium mb-2">Formato partita</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => {
                    setIsTournament(false);
                    setPointsOverrides([0]);
                    setExpandedRoundCats(null);
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${!isTournament ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                  <div className="text-xl mb-1">🎯</div>
                  <div className="font-medium text-sm">Singola modalità</div>
                </button>
                <button onClick={() => {
                    setIsTournament(true);
                    setPointsOverrides(Array(tournamentModes.length).fill(0));
                    setTournamentCategoryIdsByRound(Array(tournamentModes.length).fill(null).map(() => []));
                  }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${isTournament ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                  <div className="text-xl mb-1">🏆</div>
                  <div className="font-medium text-sm">Torneo</div>
                </button>
              </div>
            </div>

            {/* Modalità singola */}
            {!isTournament && (
              <div>
                <label className="block text-sm font-medium mb-2">Modalità di gioco</label>
                <div className="grid grid-cols-2 gap-2">
                  {QUESTION_TYPE_LIST.map((m) => {
                    const count = countsByType[m.type] ?? 0;
                    const empty = count === 0;
                    return (
                      <button key={m.type} onClick={() => !empty && setQuestionType(m.type)} disabled={empty}
                        title={empty ? "Nessuna domanda per questa modalità. Creane in Admin." : undefined}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          empty ? "border-border/50 bg-border/5 text-muted/50 cursor-not-allowed" :
                          questionType === m.type ? "border-accent bg-accent/10 text-white" :
                          "border-border text-muted hover:border-muted"
                        }`}>
                        <div className="text-xl mb-1">{m.icon}</div>
                        <div className="font-medium text-sm leading-tight">{m.label}</div>
                        <div className="text-xs text-muted mt-0.5 leading-tight">{m.description}</div>
                        <div className={`text-[10px] mt-1 font-mono ${empty ? "text-danger" : "text-accent/70"}`}>
                          {empty ? "0 disponibili" : `${count} disponibili`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modalità torneo (con ripetizioni) */}
            {isTournament && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sequenza round ({tournamentModes.length})
                </label>
                <p className="text-xs text-muted mb-2">
                  Puoi ripetere la stessa modalità più volte. Min 2, max 8 round.
                </p>

                <div className="space-y-2 mb-3">
                  {tournamentModes.map((type, i) => {
                    const mode = QUESTION_TYPE_META[type];
                    const tl = tournamentTimeLimits[i] ?? 20;
                    const noLimit = tl === 0;
                    return (
                      <div key={`${type}-${i}`} className="p-2 rounded-lg bg-accent/10 border-2 border-accent/40 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-accent text-background font-bold flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                          <span className="text-lg">{mode.icon}</span>
                          <span className="flex-1 text-sm font-medium truncate">{mode.label}</span>
                          <div className="flex gap-1">
                            <button onClick={() => moveMode(i, -1)} disabled={i === 0}
                              className="w-7 h-7 rounded border border-border disabled:opacity-30 text-muted hover:text-white text-xs">↑</button>
                            <button onClick={() => moveMode(i, 1)} disabled={i === tournamentModes.length - 1}
                              className="w-7 h-7 rounded border border-border disabled:opacity-30 text-muted hover:text-white text-xs">↓</button>
                            <button onClick={() => removeTournamentMode(i)} disabled={tournamentModes.length <= 2}
                              className="w-7 h-7 rounded border border-danger/40 text-danger disabled:opacity-30 text-xs">✕</button>
                          </div>
                        </div>
                        {/* Selettore tempo del singolo round */}
                        <div className="flex items-center gap-2 pl-9">
                          <span className="text-xs text-muted">⏱ Tempo:</span>
                          <span className="text-xs font-mono text-accent min-w-[40px]">
                            {noLimit ? "♾️" : `${tl}s`}
                          </span>
                          <input
                            type="range" min={10} max={60} step={5}
                            value={noLimit ? 60 : tl}
                            disabled={noLimit}
                            onChange={(e) => setRoundTimeLimit(i, Number(e.target.value))}
                            className="flex-1 accent-accent disabled:opacity-30"
                          />
                          <button type="button"
                            onClick={() => setRoundTimeLimit(i, noLimit ? 20 : 0)}
                            className={`px-2 py-1 rounded text-xs border ${noLimit ? "border-accent bg-accent/20 text-white" : "border-border text-muted hover:text-white"}`}
                            title="Senza limite"
                          >
                            ♾️
                          </button>
                        </div>
                        {/* Selettore punti del singolo round */}
                        <div className="flex items-center gap-2 pl-9">
                          <span className="text-xs text-muted">🎯 Punti:</span>
                          <span className="text-xs font-mono text-accent min-w-[60px]">
                            {(pointsOverrides[i] ?? 0) === 0 ? "default" : pointsOverrides[i]}
                          </span>
                          <input
                            type="range" min={0} max={5000} step={100}
                            value={pointsOverrides[i] ?? 0}
                            onChange={(e) => setPointsOverrides((prev) => prev.map((v, idx) => idx === i ? Number(e.target.value) : v))}
                            className="flex-1 accent-accent"
                          />
                        </div>
                        {/* Categorie del singolo round */}
                        <div className="pl-9">
                          <button type="button"
                            onClick={() => setExpandedRoundCats(expandedRoundCats === i ? null : i)}
                            className="flex w-full items-center justify-between text-xs text-muted hover:text-white"
                          >
                            <span>
                              🏷️ Categorie del round{" "}
                              <span className="text-accent">
                                {(tournamentCategoryIdsByRound[i]?.length ?? 0) === 0
                                  ? "— Tutte (filtro globale)"
                                  : `— ${tournamentCategoryIdsByRound[i].length} selezionate`}
                              </span>
                            </span>
                            <span>{expandedRoundCats === i ? "▼" : "▶"}</span>
                          </button>
                          {expandedRoundCats === i && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {categories.map((c) => {
                                const active = (tournamentCategoryIdsByRound[i] ?? []).includes(c.id);
                                return (
                                  <button key={c.id} type="button"
                                    onClick={() => setTournamentCategoryIdsByRound((prev) => prev.map((arr, idx) => {
                                      if (idx !== i) return arr;
                                      return arr.includes(c.id) ? arr.filter((x) => x !== c.id) : [...arr, c.id];
                                    }))}
                                    className={`p-2 rounded-lg border-2 text-left text-xs transition-all ${active ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                                    <span className="mr-1">{c.icon}</span>
                                    {c.name}
                                    <span className="text-[10px] text-muted ml-1">({c._count?.questions ?? 0})</span>
                                  </button>
                                );
                              })}
                              {(tournamentCategoryIdsByRound[i]?.length ?? 0) > 0 && (
                                <button type="button"
                                  onClick={() => setTournamentCategoryIdsByRound((prev) => prev.map((arr, idx) => idx === i ? [] : arr))}
                                  className="col-span-2 text-[11px] text-muted hover:text-white underline mt-1">
                                  Cancella selezione (usa filtro globale)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Aggiungi modalità (consente duplicati) */}
                {tournamentModes.length < 8 && (
                  <div>
                    <p className="text-xs text-muted mb-2">Aggiungi round:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUESTION_TYPE_LIST.map((m) => {
                        const count = countsByType[m.type] ?? 0;
                        const empty = count === 0;
                        return (
                          <button key={m.type} onClick={() => !empty && addTournamentMode(m.type)} disabled={empty}
                            title={empty ? "Nessuna domanda per questa modalità." : undefined}
                            className={`p-2 rounded-lg border-2 border-dashed text-left transition-all ${
                              empty ? "border-border/40 text-muted/40 cursor-not-allowed" :
                              "border-border text-muted hover:border-accent hover:text-white"
                            }`}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{m.icon}</span>
                              <span className="text-xs font-medium flex-1">+ {m.label}</span>
                              <span className={`text-[10px] font-mono ${empty ? "text-danger" : "text-muted/70"}`}>
                                {count}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Difficoltà */}
            <div>
              <label className="block text-sm font-medium mb-2">Difficoltà</label>
              <div className="grid grid-cols-4 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={`py-3 rounded-xl border-2 font-medium transition-all text-xs ${difficulty === d.value ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                    <div className="text-lg mb-0.5">{d.icon}</div>
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1">
                I punti vengono moltiplicati: Facile ×0.5, Medio ×1, Difficile ×2
              </p>
            </div>

            {/* Tempo per domanda — solo modalità singola (nel torneo ogni round ha il suo tempo) */}
            {!isTournament && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tempo per domanda:{" "}
                  <span className="text-accent">
                    {timeLimitOverride === 0 ? "senza limite" : `${timeLimitOverride}s`}
                  </span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={timeLimitOverride === 0 ? 60 : (timeLimitOverride ?? 20)}
                  onChange={(e) => setTimeLimitOverride(Number(e.target.value))}
                  disabled={timeLimitOverride === 0}
                  className="w-full accent-accent disabled:opacity-30"
                />
                <div className="flex justify-between text-xs text-muted mt-1 mb-2">
                  <span>10s</span>
                  <span>60s</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTimeLimitOverride(timeLimitOverride === 0 ? 20 : 0)}
                  className={`w-full py-2 rounded-lg border-2 text-sm transition-all ${
                    timeLimitOverride === 0
                      ? "border-accent bg-accent/10 text-white"
                      : "border-border text-muted hover:border-muted"
                  }`}
                >
                  ♾️ Senza limite {timeLimitOverride === 0 ? "(attivo — termini tu la domanda)" : ""}
                </button>
              </div>
            )}

            {/* Categorie — gerarchica (root espandibili con sub-categorie) */}
            <div>
              <button onClick={() => setShowCategories(!showCategories)}
                className="flex w-full items-center justify-between text-sm font-medium">
                <span>
                  Categorie {selectedCategoryIds.length > 0 ? `(${selectedCategoryIds.length} selezionate)` : "(tutte)"}
                </span>
                <span className="text-muted">{showCategories ? "▼" : "▶"}</span>
              </button>
              {showCategories && (
                <div className="mt-2 space-y-2">
                  {categoryTree.map((root) => {
                    const allIds = allDescendantIds(root);
                    const selectedChildren = allIds.filter((id) => selectedCategoryIds.includes(id)).length;
                    const rootActive = selectedChildren > 0 && selectedChildren === allIds.length;
                    const rootPartial = selectedChildren > 0 && selectedChildren < allIds.length;
                    const isExpanded = expandedRoots.has(root.id);
                    return (
                      <div key={root.id} className="rounded-lg border-2 border-border overflow-hidden">
                        <div className={`flex items-center gap-2 p-2 ${rootActive ? "bg-accent/10" : rootPartial ? "bg-accent/5" : "bg-surface/30"}`}>
                          <button
                            onClick={() => toggleRootSelection(root)}
                            className={`flex-1 flex items-center gap-2 text-left ${rootActive ? "text-white" : "text-muted"}`}
                          >
                            <span className={`w-5 h-5 flex items-center justify-center rounded border-2 text-xs ${rootActive ? "bg-accent border-accent text-background" : rootPartial ? "border-accent text-accent" : "border-border"}`}>
                              {rootActive ? "✓" : rootPartial ? "–" : ""}
                            </span>
                            <span>{root.icon}</span>
                            <span className="font-medium text-sm">{root.name}</span>
                            <span className="text-xs text-muted">
                              ({root.totalCount}{root.children.length > 0 ? ` · ${root.children.length} sub` : ""})
                            </span>
                          </button>
                          {root.children.length > 0 && (
                            <button onClick={() => toggleRoot(root.id)}
                              className="text-muted hover:text-white text-sm px-2"
                              aria-label={isExpanded ? "Comprimi" : "Espandi"}>
                              {isExpanded ? "▾" : "▸"}
                            </button>
                          )}
                        </div>
                        {isExpanded && root.children.length > 0 && (
                          <div className="pl-6 pr-2 pb-2 pt-1 space-y-1 bg-background/50">
                            {root.children.map((sub) => {
                              const subActive = selectedCategoryIds.includes(sub.id);
                              return (
                                <button key={sub.id} onClick={() => toggleCategory(sub.id)}
                                  className={`w-full flex items-center gap-2 p-1.5 rounded text-left text-xs transition-all ${subActive ? "bg-accent/15 text-white" : "text-muted hover:bg-surface/30"}`}>
                                  <span className={`w-4 h-4 flex items-center justify-center rounded border text-[10px] ${subActive ? "bg-accent border-accent text-background" : "border-border"}`}>
                                    {subActive ? "✓" : ""}
                                  </span>
                                  <span>{sub.icon}</span>
                                  <span className="flex-1 truncate">{sub.name}</span>
                                  <span className="text-muted text-[11px]">{sub.totalCount}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selectedCategoryIds.length > 0 && (
                    <button onClick={() => setSelectedCategoryIds([])}
                      className="w-full text-xs text-muted hover:text-white underline mt-1">
                      Cancella selezione (usa tutte le categorie)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Numero domande */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {isTournament ? `Domande per round: ${totalQuestions}` : `Numero domande: ${totalQuestions}`}
                {isTournament && <span className="text-muted text-xs ml-2">(totale {totalQuestions * tournamentModes.length})</span>}
              </label>
              <input type="range" min={isTournament ? 3 : 5} max={isTournament ? 10 : 20} step={1}
                value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full accent-accent" />
            </div>

            {/* Scelta manuale domande — per singola modalità o per-round */}
            <div>
              <label className="block text-sm font-medium mb-2">📝 Domande: scelta manuale</label>
              <p className="text-xs text-muted mb-2">Vuoi decidere tu le domande esatte? Aprile e seleziona.</p>
              {isTournament ? (
                <div className="space-y-2">
                  {tournamentModes.map((type, i) => {
                    const sel = manualQuestionIds[i] ?? [];
                    const complete = sel.length === totalQuestions;
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                        <span className="text-sm w-6">R{i + 1}</span>
                        <span className="text-xs text-muted flex-1 truncate">
                          {complete ? `✓ ${sel.length} selezionate` : sel.length > 0 ? `${sel.length}/${totalQuestions} selezionate` : "Casuale (filtri)"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPickerOpenRound(i)}
                          className={`px-3 py-1 rounded text-xs ${complete ? "bg-accent/20 text-accent" : "border border-border text-muted hover:text-white"}`}
                        >
                          {complete ? "Modifica" : "Scegli"}
                        </button>
                        {sel.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setManualQuestionIds((prev) => prev.map((arr, idx) => idx === i ? [] : arr))}
                            className="text-danger text-xs hover:underline"
                          >Reset</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg border border-border">
                  <span className="text-xs text-muted flex-1">
                    {manualQuestionIds[0]?.length === totalQuestions
                      ? `✓ ${manualQuestionIds[0].length} selezionate`
                      : (manualQuestionIds[0]?.length ?? 0) > 0
                        ? `${manualQuestionIds[0].length}/${totalQuestions} selezionate`
                        : "Casuale (usa i filtri)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerOpenRound(0)}
                    className="px-3 py-1 rounded text-xs border border-border text-muted hover:text-white"
                  >
                    {(manualQuestionIds[0]?.length ?? 0) === totalQuestions ? "Modifica" : "Scegli"}
                  </button>
                  {(manualQuestionIds[0]?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setManualQuestionIds([[]])}
                      className="text-danger text-xs hover:underline"
                    >Reset</button>
                  )}
                </div>
              )}
            </div>

            {/* Punti per domanda — solo modalità singola (nel torneo ogni round ha i suoi punti) */}
            {!isTournament && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Punti per domanda:{" "}
                  <span className="text-accent">
                    {pointsOverrides[0] === 0 ? "default (1000)" : pointsOverrides[0]}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={100}
                  value={pointsOverrides[0] ?? 0}
                  onChange={(e) => setPointsOverrides([Number(e.target.value)])}
                  className="w-full accent-accent"
                />
                <p className="text-xs text-muted mt-1">0 = usa i punti configurati nella domanda</p>
              </div>
            )}

            {/* Ultimo in piedi */}
            <div>
              <label className="block text-sm font-medium mb-2">Opzioni</label>
              <button
                type="button"
                onClick={() => setLastManStanding(!lastManStanding)}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  lastManStanding
                    ? "border-danger bg-danger/10 text-white"
                    : "border-border text-muted hover:border-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏃</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      Ultimo in piedi {lastManStanding && "· attivo"}
                    </div>
                    <div className="text-xs text-muted">
                      Una risposta sbagliata ti elimina dalla partita. Vince l&apos;ultimo rimasto.
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${lastManStanding ? "bg-danger" : "bg-border"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${lastManStanding ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </div>
              </button>
            </div>

            {/* Caduta libera — disponibile anche in torneo */}
            {true && (
              <div>
                <button
                  type="button"
                  onClick={() => setLivesAllowed(livesAllowed ? null : 3)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    livesAllowed ? "border-warning bg-warning/10 text-white" : "border-border text-muted hover:border-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🪜</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Caduta libera {livesAllowed && `· ${livesAllowed} vite`}</div>
                      <div className="text-xs text-muted">Hai N errori prima dell&apos;eliminazione.</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${livesAllowed ? "bg-warning" : "bg-border"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${livesAllowed ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                </button>
                {livesAllowed && (
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setLivesAllowed(n)}
                        className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${
                          livesAllowed === n ? "border-warning bg-warning/10 text-white" : "border-border text-muted"
                        }`}>
                        {"❤️".repeat(n)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Speedrun — disponibile anche in torneo */}
            {true && (
              <div>
                <button
                  type="button"
                  onClick={() => setSpeedrunDuration(speedrunDuration ? null : 60)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    speedrunDuration ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Speedrun {speedrunDuration && `· ${speedrunDuration}s totali`}</div>
                      <div className="text-xs text-muted">Domande rapide (10s ciascuna) finché scade il timer globale.</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${speedrunDuration ? "bg-accent" : "bg-border"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${speedrunDuration ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                </button>
                {speedrunDuration && (
                  <div className="mt-2 flex gap-2">
                    {[30, 60, 90, 120, 180].map((s) => (
                      <button key={s} type="button" onClick={() => setSpeedrunDuration(s)}
                        className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium ${
                          speedrunDuration === s ? "border-accent bg-accent/10 text-white" : "border-border text-muted"
                        }`}>
                        {s}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Jeopardy */}
            {!isTournament && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !jeopardyMode;
                    setJeopardyMode(next);
                    if (next) setCategoryPickMode(false);
                  }}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    jeopardyMode ? "border-gold bg-gold/10 text-white" : "border-border text-muted hover:border-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Jeopardy / Rischiatutto {jeopardyMode && "· attivo"}</div>
                      <div className="text-xs text-muted">L&apos;host sceglie dalla griglia categoria × valore. Valori 100-500.</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${jeopardyMode ? "bg-gold" : "bg-border"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${jeopardyMode ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Scegli categoria — mutuamente esclusivo con Jeopardy */}
            {!isTournament && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !categoryPickMode;
                    setCategoryPickMode(next);
                    if (next) setJeopardyMode(false);
                  }}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                    categoryPickMode ? "border-gold bg-gold/10 text-white" : "border-border text-muted hover:border-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Scegli categoria {categoryPickMode && "· attivo"}</div>
                      <div className="text-xs text-muted">Prima di ogni domanda l&apos;host sceglie la categoria. Si esauriscono via via.</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${categoryPickMode ? "bg-gold" : "bg-border"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${categoryPickMode ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Aiuti — non disponibili in modalità presentatore (richiedono dispositivi dei giocatori) */}
            {!localPartyMode && (
            <div>
              <label className="block text-sm font-medium mb-2">Aiuti per giocatore</label>
              <p className="text-xs text-muted mb-3">
                Disponibili per tutte le modalità. Ogni giocatore potrà usarli un numero limitato di volte.
              </p>

              {/* 50/50 */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎯</span>
                  <span className="font-medium text-sm flex-1">50/50 <span className="text-xs text-muted">(solo MC)</span></span>
                  <span className="text-xs text-accent font-mono">{fiftyFiftyCount === 0 ? "off" : `×${fiftyFiftyCount}`}</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setFiftyFiftyCount(n)}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium ${
                        fiftyFiftyCount === n ? "border-accent bg-accent/10 text-white" : "border-border text-muted"
                      }`}>
                      {n === 0 ? "off" : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skip */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⏭</span>
                  <span className="font-medium text-sm flex-1">Salto <span className="text-xs text-muted">(tutte le modalità)</span></span>
                  <span className="text-xs text-warning font-mono">{skipCount === 0 ? "off" : `×${skipCount}`}</span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setSkipCount(n)}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-medium ${
                        skipCount === n ? "border-warning bg-warning/10 text-white" : "border-border text-muted"
                      }`}>
                      {n === 0 ? "off" : n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}

            {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>}

            <button onClick={createGame} disabled={loading || !isConnected} className="btn-primary w-full">
              {loading ? "Creazione..." : !isConnected ? "Connessione al server..."
                : isTournament ? `Crea torneo (${tournamentModes.length} round)` : "Crea partita"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal scelta manuale domande */}
      {pickerOpenRound !== null && (
        <QuestionPicker
          isOpen={true}
          onClose={() => setPickerOpenRound(null)}
          onConfirm={(ids) => {
            setManualQuestionIds((prev) => prev.map((arr, idx) => idx === pickerOpenRound ? ids : arr));
            setPickerOpenRound(null);
          }}
          initialSelected={manualQuestionIds[pickerOpenRound] ?? []}
          totalNeeded={totalQuestions}
          type={isTournament ? tournamentModes[pickerOpenRound] : questionType}
          difficulty={difficulty}
          categoryIds={
            isTournament
              ? (tournamentCategoryIdsByRound[pickerOpenRound]?.length
                  ? tournamentCategoryIdsByRound[pickerOpenRound]
                  : selectedCategoryIds)
              : selectedCategoryIds
          }
          title={isTournament ? `Scegli le domande — Round ${pickerOpenRound + 1}` : "Scegli le domande"}
        />
      )}
    </main>
  );
}
