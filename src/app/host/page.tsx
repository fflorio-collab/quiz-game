"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/useSocket";
import type { QuestionType, DifficultyFilter, PlayMode } from "@/types/socket";
import { QUESTION_TYPE_LIST, QUESTION_TYPE_META } from "@/lib/questionTypes";
import {
  type RoundConfig,
  TOURNAMENT_MIN_ROUNDS,
  TOURNAMENT_MAX_ROUNDS,
} from "@/lib/roundsConfig";
import QuestionPicker from "@/components/QuestionPicker";

type Category = { id: string; name: string; icon?: string | null; color?: string | null; parentId?: string | null; _count?: { questions: number } };
type CategoryTreeNode = {
  id: string; name: string; slug: string; icon: string | null; color: string | null;
  parentId: string | null; count: number; totalCount: number; children: CategoryTreeNode[];
};
type Pack = { id: string; name: string; slug: string; icon?: string | null; color?: string | null; isPublic: boolean; _count?: { questions: number } };

const DIFFICULTIES: { value: DifficultyFilter; label: string; icon: string }[] = [
  { value: "ALL", label: "Tutte", icon: "🎲" },
  { value: "EASY", label: "Facile", icon: "😊" },
  { value: "MEDIUM", label: "Medio", icon: "🧠" },
  { value: "HARD", label: "Difficile", icon: "🔥" },
];

// Crea un round vuoto col tipo dato. I default vengono dalla capability matrix.
function makeRound(type: QuestionType): RoundConfig {
  const meta = QUESTION_TYPE_META[type];
  return {
    id: crypto.randomUUID(),
    type,
    timeLimit: meta.defaultTimeLimit,
    pointsExact: null,    // null = usa default per tipo
    pointsWrong: null,
    winnerBonus: meta.defaultWinnerBonus,
    categoryIds: [],
    packIds: [],
    manualQuestionIds: [],
    speedrun: null,
    fiftyFifty: 0,
    skip: 0,
    lives: null,
    lastManStanding: false,
    categoryPick: false,
    jeopardy: false,
    localPartyMode: false,
    playMode: undefined,    // null = eredita da Game.playMode
    passOnWrong: undefined,
  };
}

export default function HostPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  // Top-level
  const [hostName, setHostName] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [isTournament, setIsTournament] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);

  // Modalità di gioco di base (default per tutti i round; ogni round può overridarla)
  const [playMode, setPlayMode] = useState<PlayMode>("FREE_FOR_ALL");
  const [passOnWrong, setPassOnWrong] = useState(false);
  // Ordine turni (CSV playerIds) — generato server-side al join se vuoto. UI di edit nella lobby.
  const [turnOrder, setTurnOrder] = useState<string[]>([]);

  // Modalità presentatore (live host, no devices) — flag a livello partita.
  const [localPartyMode, setLocalPartyMode] = useState(false);

  // Round config — array unificato per partita singola e torneo.
  // Singola = 1 round; torneo = 2..15 round.
  const [rounds, setRounds] = useState<RoundConfig[]>([makeRound("MULTIPLE_CHOICE")]);
  // Quale round è "espanso" nell'editor (in lista torneo). null = nessuno
  const [expandedRound, setExpandedRound] = useState<number | null>(0);

  // Filtri categorie (globali) + alberi
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(new Set());
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});

  // Pack disponibili
  const [packs, setPacks] = useState<Pack[]>([]);

  // QuestionPicker (manual selection per round)
  const [pickerOpenRound, setPickerOpenRound] = useState<number | null>(null);

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
    // I pack sono accessibili dall'host registrato (pubblici + propri).
    fetch("/api/admin/packs").then((r) => r.ok ? r.json() : { packs: [] }).then((d) => setPacks(d.packs || [])).catch(() => {});
  }, []);

  // Quando il torneo viene attivato/disattivato, riallineo l'array round
  useEffect(() => {
    if (isTournament && rounds.length < TOURNAMENT_MIN_ROUNDS) {
      setRounds((prev) => {
        const fill: RoundConfig[] = [...prev];
        while (fill.length < TOURNAMENT_MIN_ROUNDS) fill.push(makeRound("MULTIPLE_CHOICE"));
        return fill;
      });
    } else if (!isTournament && rounds.length > 1) {
      setRounds((prev) => prev.slice(0, 1));
      setExpandedRound(0);
    }
  }, [isTournament, rounds.length]);

  // Espandi/comprimi una root categoria
  const toggleRoot = (rootId: string) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId); else next.add(rootId);
      return next;
    });
  };

  const allDescendantIds = (node: CategoryTreeNode): string[] => {
    const ids = [node.id];
    for (const ch of node.children) ids.push(...allDescendantIds(ch));
    return ids;
  };

  const toggleRootSelection = (node: CategoryTreeNode) => {
    const ids = allDescendantIds(node);
    const allSelected = ids.every((id) => selectedCategoryIds.includes(id));
    setSelectedCategoryIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Round operations
  const updateRound = (idx: number, patch: Partial<RoundConfig>) => {
    setRounds((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRound = (type: QuestionType = "MULTIPLE_CHOICE") => {
    if (rounds.length >= TOURNAMENT_MAX_ROUNDS) return;
    setRounds((prev) => [...prev, makeRound(type)]);
    setExpandedRound(rounds.length); // espandi il nuovo round
  };

  const removeRound = (idx: number) => {
    if (rounds.length <= TOURNAMENT_MIN_ROUNDS && isTournament) return;
    if (!isTournament && rounds.length <= 1) return;
    setRounds((prev) => prev.filter((_, i) => i !== idx));
    setExpandedRound((prev) => (prev === idx ? null : prev !== null && prev > idx ? prev - 1 : prev));
  };

  const moveRound = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= rounds.length) return;
    setRounds((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const changeRoundType = (idx: number, type: QuestionType) => {
    // Quando cambio tipo, normalizzo le opzioni che il nuovo tipo non supporta.
    const meta = QUESTION_TYPE_META[type];
    const r = rounds[idx];
    updateRound(idx, {
      type,
      timeLimit: meta.defaultTimeLimit,
      winnerBonus: meta.defaultWinnerBonus,
      // Se l'opzione attiva non è più compatibile, la spengo
      speedrun: meta.compat.speedrun ? r.speedrun : null,
      fiftyFifty: meta.compat.fiftyFifty ? r.fiftyFifty : 0,
      skip: meta.compat.skip ? r.skip : 0,
      lives: meta.compat.lives ? r.lives : null,
      lastManStanding: meta.compat.lastManStanding ? r.lastManStanding : false,
      categoryPick: meta.compat.categoryPick ? r.categoryPick : false,
      jeopardy: meta.compat.jeopardy ? r.jeopardy : false,
      localPartyMode: meta.compat.localPartyMode ? r.localPartyMode : false,
      playMode: r.playMode,
      passOnWrong: r.passOnWrong,
    });
  };

  // Disponibilità globale calcolata: numero domande per tipo (per disabilitare bottoni "modalità senza domande")
  const isTypeEmpty = (t: QuestionType) => (countsByType[t] ?? 0) === 0;

  // Submit
  const createGame = () => {
    if (!socket) return;
    if (!hostName.trim()) { setError("Inserisci il tuo nome"); return; }
    if (isTournament && rounds.length < TOURNAMENT_MIN_ROUNDS) {
      setError(`Seleziona almeno ${TOURNAMENT_MIN_ROUNDS} round per il torneo`); return;
    }
    setLoading(true); setError("");

    // Costruisco anche i campi "legacy" (parallel arrays) per compatibilità col server attuale,
    // finché il dispatcher non leggerà direttamente roundsConfig.
    const legacyTournamentModes = isTournament ? rounds.map((r) => r.type) : undefined;
    const legacyTimeLimits = isTournament ? rounds.map((r) => r.timeLimit ?? QUESTION_TYPE_META[r.type].defaultTimeLimit) : undefined;
    const legacyPointsOverrides = rounds.map((r) => r.pointsExact ?? 0);
    const legacyTournamentCategoryIds = isTournament ? rounds.map((r) => r.categoryIds ?? []) : undefined;
    const legacyManualQuestionIds = rounds.some((r) => (r.manualQuestionIds?.length ?? 0) > 0)
      ? rounds.map((r) => r.manualQuestionIds ?? [])
      : undefined;

    // Opzioni globali "vecchie" prese dal primo round (compat) — il nuovo dispatcher le ignora
    const r0 = rounds[0];

    socket.emit(
      "host:create",
      {
        hostName: hostName.trim(),
        difficulty,
        totalQuestions,
        questionType: r0.type,
        // Nuovo contratto (server moderno):
        roundsConfig: rounds,
        playMode,
        passOnWrong,
        turnOrder: turnOrder.length > 0 ? turnOrder : undefined,
        // Legacy (server attuale):
        tournamentModes: legacyTournamentModes,
        tournamentTimeLimits: legacyTimeLimits,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        timeLimitOverride: !isTournament ? (r0.timeLimit ?? null) : null,
        lastManStanding: r0.lastManStanding,
        speedrunDuration: r0.speedrun,
        livesAllowed: r0.lives,
        jeopardyMode: r0.jeopardy,
        fiftyFiftyCount: localPartyMode ? 0 : (r0.fiftyFifty ?? 0),
        skipCount: localPartyMode ? 0 : (r0.skip ?? 0),
        localPartyMode,
        pointsOverrides: legacyPointsOverrides,
        tournamentCategoryIds: legacyTournamentCategoryIds,
        categoryPickMode: r0.categoryPick,
        manualQuestionIds: legacyManualQuestionIds,
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
        <Link href="/" className="apple-link text-sm mb-6 inline-flex">‹ Indietro</Link>

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

            {/* Modalità presentatore */}
            <ToggleRow
              label="Modalità presentatore"
              description="Niente dispositivi: leggi le domande a voce, giudichi tu le risposte."
              icon="📣"
              active={localPartyMode}
              onChange={setLocalPartyMode}
              activeColor="gold"
            />

            {/* Formato */}
            <div>
              <label className="block text-sm font-medium mb-2">Formato partita</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIsTournament(false)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${!isTournament ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                  <div className="text-xl mb-1">🎯</div>
                  <div className="font-medium text-sm">Singola modalità</div>
                </button>
                <button onClick={() => setIsTournament(true)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${isTournament ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                  <div className="text-xl mb-1">🏆</div>
                  <div className="font-medium text-sm">Torneo</div>
                </button>
              </div>
            </div>

            {/* Singola modalità: scelta tipo (un solo round) */}
            {!isTournament && (
              <div>
                <label className="block text-sm font-medium mb-2">Modalità di gioco</label>
                <div className="grid grid-cols-2 gap-2">
                  {QUESTION_TYPE_LIST.map((m) => {
                    const empty = isTypeEmpty(m.type);
                    const selected = rounds[0]?.type === m.type;
                    return (
                      <button key={m.type}
                        onClick={() => !empty && changeRoundType(0, m.type)}
                        disabled={empty}
                        title={empty ? "Nessuna domanda per questa modalità." : undefined}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          empty ? "border-border/50 bg-border/5 text-muted/50 cursor-not-allowed" :
                          selected ? "border-accent bg-accent/10 text-white" :
                          "border-border text-muted hover:border-muted"
                        }`}>
                        <div className="text-xl mb-1">{m.icon}</div>
                        <div className="font-medium text-sm leading-tight">{m.label}</div>
                        <div className="text-xs text-muted mt-0.5 leading-tight">{m.description}</div>
                        <div className={`text-[10px] mt-1 font-mono ${empty ? "text-danger" : "text-accent/70"}`}>
                          {empty ? "0 disponibili" : `${countsByType[m.type] ?? 0} disponibili`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Torneo: lista round con editor inline */}
            {isTournament && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sequenza round ({rounds.length}/{TOURNAMENT_MAX_ROUNDS})
                </label>
                <p className="text-xs text-muted mb-3">
                  Min {TOURNAMENT_MIN_ROUNDS}, max {TOURNAMENT_MAX_ROUNDS}. Ogni round ha le sue regole.
                </p>

                <div className="space-y-2 mb-3">
                  {rounds.map((r, i) => (
                    <RoundEditor
                      key={r.id ?? i}
                      round={r}
                      index={i}
                      total={rounds.length}
                      isExpanded={expandedRound === i}
                      onToggleExpand={() => setExpandedRound(expandedRound === i ? null : i)}
                      onChange={(patch) => updateRound(i, patch)}
                      onChangeType={(t) => changeRoundType(i, t)}
                      onMove={(dir) => moveRound(i, dir)}
                      onRemove={() => removeRound(i)}
                      canRemove={rounds.length > TOURNAMENT_MIN_ROUNDS}
                      categories={categories}
                      packs={packs}
                      countsByType={countsByType}
                      totalQuestions={totalQuestions}
                      onOpenManualPicker={() => setPickerOpenRound(i)}
                      localPartyMode={localPartyMode}
                    />
                  ))}
                </div>

                {rounds.length < TOURNAMENT_MAX_ROUNDS && (
                  <button onClick={() => addRound("MULTIPLE_CHOICE")}
                    className="w-full p-2 rounded-lg border-2 border-dashed border-border text-muted hover:border-accent hover:text-white transition-all text-sm">
                    + Aggiungi round
                  </button>
                )}
              </div>
            )}

            {/* Singola modalità: editor round inline (sempre espanso) */}
            {!isTournament && rounds[0] && (
              <RoundEditor
                round={rounds[0]}
                index={0}
                total={1}
                isExpanded={true}
                onToggleExpand={() => {}}
                onChange={(patch) => updateRound(0, patch)}
                onChangeType={(t) => changeRoundType(0, t)}
                onMove={() => {}}
                onRemove={() => {}}
                canRemove={false}
                hideHeader
                categories={categories}
                packs={packs}
                countsByType={countsByType}
                totalQuestions={totalQuestions}
                onOpenManualPicker={() => setPickerOpenRound(0)}
                localPartyMode={localPartyMode}
              />
            )}

            {/* Difficoltà globale */}
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
              <p className="text-xs text-muted mt-1">I punti vengono moltiplicati: Facile ×0.5, Medio ×1, Difficile ×2</p>
            </div>

            {/* Categorie globali (filtro fallback per round senza categorie/pack specifici) */}
            <div>
              <button onClick={() => setShowCategories(!showCategories)}
                className="flex w-full items-center justify-between text-sm font-medium">
                <span>
                  Categorie globali {selectedCategoryIds.length > 0 ? `(${selectedCategoryIds.length} selezionate)` : "(tutte)"}
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
                          <button onClick={() => toggleRootSelection(root)}
                            className={`flex-1 flex items-center gap-2 text-left ${rootActive ? "text-white" : "text-muted"}`}>
                            <span className={`w-5 h-5 flex items-center justify-center rounded border-2 text-xs ${rootActive ? "bg-accent border-accent text-background" : rootPartial ? "border-accent text-accent" : "border-border"}`}>
                              {rootActive ? "✓" : rootPartial ? "–" : ""}
                            </span>
                            <span>{root.icon}</span>
                            <span className="font-medium text-sm">{root.name}</span>
                            <span className="text-xs text-muted">({root.totalCount})</span>
                          </button>
                          {root.children.length > 0 && (
                            <button onClick={() => toggleRoot(root.id)} className="text-muted hover:text-white text-sm px-2">
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
                {isTournament && <span className="text-muted text-xs ml-2">(totale {totalQuestions * rounds.length})</span>}
              </label>
              <input type="range" min={isTournament ? 3 : 5} max={isTournament ? 10 : 20} step={1}
                value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full accent-accent" />
            </div>

            {/* Modalità di gioco di base: Turno vs Tutti contro tutti
                Disponibile sempre, anche in modalità presentatore (host gestisce a voce). */}
            {true && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Modalità giocatori
                  <span className="text-xs text-muted ml-2">(default per tutti i round)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPlayMode("FREE_FOR_ALL")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${playMode === "FREE_FOR_ALL" ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                    <div className="text-xl mb-1">🥊</div>
                    <div className="font-medium text-sm">Tutti contro tutti</div>
                    <div className="text-xs text-muted">Tutti rispondono insieme.</div>
                  </button>
                  <button onClick={() => setPlayMode("TURN_BASED")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${playMode === "TURN_BASED" ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                    <div className="text-xl mb-1">🔁</div>
                    <div className="font-medium text-sm">A turno</div>
                    <div className="text-xs text-muted">Risponde un giocatore alla volta.</div>
                  </button>
                </div>
                {playMode === "TURN_BASED" && (
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" checked={passOnWrong} onChange={(e) => setPassOnWrong(e.target.checked)}
                      className="w-4 h-4 accent-accent" />
                    <span className="text-sm">Se sbaglia, passa al successivo (sulla stessa domanda)</span>
                  </label>
                )}
                <p className="text-xs text-muted mt-2">
                  L&apos;ordine dei turni viene generato a caso al via partita; potrai modificarlo prima di iniziare.
                </p>
              </div>
            )}

            {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">{error}</div>}

            <button onClick={createGame} disabled={loading || !isConnected} className="btn-primary w-full">
              {loading ? "Creazione..." : !isConnected ? "Connessione al server..."
                : isTournament ? `Crea torneo (${rounds.length} round)` : "Crea partita"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal scelta manuale domande */}
      {pickerOpenRound !== null && rounds[pickerOpenRound] && (
        <QuestionPicker
          isOpen={true}
          onClose={() => setPickerOpenRound(null)}
          onConfirm={(ids) => {
            updateRound(pickerOpenRound, { manualQuestionIds: ids });
            setPickerOpenRound(null);
          }}
          initialSelected={rounds[pickerOpenRound].manualQuestionIds ?? []}
          totalNeeded={totalQuestions}
          type={rounds[pickerOpenRound].type}
          difficulty={difficulty}
          categoryIds={
            (rounds[pickerOpenRound].categoryIds?.length ?? 0) > 0
              ? rounds[pickerOpenRound].categoryIds!
              : selectedCategoryIds
          }
          title={isTournament ? `Scegli le domande — Round ${pickerOpenRound + 1}` : "Scegli le domande"}
        />
      )}
    </main>
  );
}

// ── Sub-componenti ──────────────────────────────────────────────────────────

function ToggleRow({
  label, description, icon, active, onChange, activeColor = "accent",
}: {
  label: string; description: string; icon: string; active: boolean;
  onChange: (v: boolean) => void; activeColor?: "accent" | "danger" | "warning" | "gold";
}) {
  const colorMap = { accent: "border-accent bg-accent/10", danger: "border-danger bg-danger/10", warning: "border-warning bg-warning/10", gold: "border-gold bg-gold/10" };
  const dotMap = { accent: "bg-accent", danger: "bg-danger", warning: "bg-warning", gold: "bg-gold" };
  return (
    <button type="button" onClick={() => onChange(!active)}
      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${active ? `${colorMap[activeColor]} text-white` : "border-border text-muted hover:border-muted"}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{label} {active && "· attivo"}</div>
          <div className="text-xs text-muted">{description}</div>
        </div>
        <div className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${active ? dotMap[activeColor] : "bg-border"}`}>
          <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
        </div>
      </div>
    </button>
  );
}

// Editor di un singolo round. Tutte le opzioni sono filtrate dalla capability matrix
// del tipo selezionato: 50/50 solo MC, Speedrun bloccato su Ghigliottina, Jeopardy solo OPEN_ANSWER, ecc.
function RoundEditor({
  round, index, total, isExpanded, onToggleExpand,
  onChange, onChangeType, onMove, onRemove, canRemove, hideHeader,
  categories, packs, countsByType, totalQuestions, onOpenManualPicker, localPartyMode,
}: {
  round: RoundConfig; index: number; total: number;
  isExpanded: boolean; onToggleExpand: () => void;
  onChange: (patch: Partial<RoundConfig>) => void;
  onChangeType: (t: QuestionType) => void;
  onMove: (dir: -1 | 1) => void; onRemove: () => void; canRemove: boolean;
  hideHeader?: boolean;
  categories: Category[]; packs: Pack[];
  countsByType: Record<string, number>;
  totalQuestions: number;
  onOpenManualPicker: () => void;
  localPartyMode: boolean;
}) {
  const meta = QUESTION_TYPE_META[round.type];
  const compat = meta.compat;
  const tl = round.timeLimit ?? meta.defaultTimeLimit;
  const noLimit = tl === 0;
  const manualSel = round.manualQuestionIds ?? [];
  const manualComplete = manualSel.length === totalQuestions;

  // Tipi disponibili per cambiare modalità del round
  const availableTypes = useMemo(() => QUESTION_TYPE_LIST.filter((m) => (countsByType[m.type] ?? 0) > 0), [countsByType]);

  return (
    <div className="p-2 rounded-lg bg-accent/10 border-2 border-accent/40 space-y-2">
      {!hideHeader && (
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-accent text-background font-bold flex items-center justify-center text-xs flex-shrink-0">{index + 1}</span>
          <span className="text-lg">{meta.icon}</span>
          <button onClick={onToggleExpand} className="flex-1 text-left text-sm font-medium truncate hover:text-white">
            {meta.label} <span className="text-muted text-xs ml-1">{isExpanded ? "▾" : "▸"}</span>
          </button>
          <div className="flex gap-1">
            <button onClick={() => onMove(-1)} disabled={index === 0} className="w-7 h-7 rounded border border-border disabled:opacity-30 text-muted hover:text-white text-xs">↑</button>
            <button onClick={() => onMove(1)} disabled={index === total - 1} className="w-7 h-7 rounded border border-border disabled:opacity-30 text-muted hover:text-white text-xs">↓</button>
            <button onClick={onRemove} disabled={!canRemove} className="w-7 h-7 rounded border border-danger/40 text-danger disabled:opacity-30 text-xs">✕</button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3 pl-1 pr-1 pt-2">
          {/* Cambia modalità del round */}
          <div>
            <p className="text-xs text-muted mb-1">Modalità</p>
            <select value={round.type} onChange={(e) => onChangeType(e.target.value as QuestionType)} className="input text-sm">
              {availableTypes.map((m) => (
                <option key={m.type} value={m.type}>{m.icon} {m.label} ({countsByType[m.type] ?? 0})</option>
              ))}
            </select>
            <p className="text-[11px] text-muted mt-1">{meta.description}</p>
          </div>

          {/* Tempo */}
          <div>
            <p className="text-xs text-muted mb-1">⏱ Tempo per domanda: <span className="font-mono text-accent">{noLimit ? "♾️ senza limite" : `${tl}s`}</span></p>
            <div className="flex items-center gap-2">
              <input type="range" min={5} max={60} step={5}
                value={noLimit ? 30 : tl} disabled={noLimit}
                onChange={(e) => onChange({ timeLimit: Number(e.target.value) })}
                className="flex-1 accent-accent disabled:opacity-30" />
              <button type="button" onClick={() => onChange({ timeLimit: noLimit ? meta.defaultTimeLimit : 0 })}
                className={`px-2 py-1 rounded text-xs border ${noLimit ? "border-accent bg-accent/20 text-white" : "border-border text-muted hover:text-white"}`}>♾️</button>
            </div>
          </div>

          {/* Punti */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted mb-1">🎯 Punti corretta</p>
              <input type="number" min={0} max={5000} step={10}
                value={round.pointsExact ?? meta.defaultPointsExact}
                onChange={(e) => onChange({ pointsExact: Number(e.target.value) })}
                className="input text-sm font-mono" />
            </div>
            <div>
              <p className="text-xs text-muted mb-1">❌ Punti sbagliata</p>
              <input type="number" min={-2000} max={2000} step={10}
                value={round.pointsWrong ?? meta.defaultPointsWrong}
                onChange={(e) => onChange({ pointsWrong: Number(e.target.value) })}
                className="input text-sm font-mono" />
            </div>
          </div>

          {/* Ghigliottina: bonus al vincitore */}
          {round.type === "GHIGLIOTTINA" && (
            <div>
              <p className="text-xs text-muted mb-1">🏆 Bonus al vincitore della ghigliottina</p>
              <input type="number" min={0} max={5000} step={100}
                value={round.winnerBonus ?? 1000}
                onChange={(e) => onChange({ winnerBonus: Number(e.target.value) })}
                className="input text-sm font-mono" />
              <p className="text-[11px] text-muted mt-1">Default 1000. Lo prende solo chi indovina la parola finale.</p>
            </div>
          )}

          {/* Sorgente: categorie del round */}
          <details className="rounded border border-border/40 p-2">
            <summary className="text-xs text-muted cursor-pointer">
              🏷️ Categorie del round <span className="text-accent">— {(round.categoryIds?.length ?? 0) === 0 ? "Tutte (filtro globale)" : `${round.categoryIds!.length} selezionate`}</span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {categories.map((c) => {
                const active = (round.categoryIds ?? []).includes(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => onChange({
                      categoryIds: active ? (round.categoryIds ?? []).filter((x) => x !== c.id) : [...(round.categoryIds ?? []), c.id],
                    })}
                    className={`p-1.5 rounded border text-left text-xs ${active ? "border-accent bg-accent/10 text-white" : "border-border text-muted"}`}>
                    {c.icon} {c.name}
                  </button>
                );
              })}
            </div>
          </details>

          {/* Sorgente: pack del round */}
          {packs.length > 0 && (
            <details className="rounded border border-border/40 p-2">
              <summary className="text-xs text-muted cursor-pointer">
                📦 Pack del round <span className="text-accent">— {(round.packIds?.length ?? 0) === 0 ? "nessuno" : `${round.packIds!.length} selezionati`}</span>
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {packs.map((p) => {
                  const active = (round.packIds ?? []).includes(p.id);
                  return (
                    <button key={p.id} type="button"
                      onClick={() => onChange({
                        packIds: active ? (round.packIds ?? []).filter((x) => x !== p.id) : [...(round.packIds ?? []), p.id],
                      })}
                      className={`p-1.5 rounded border text-left text-xs ${active ? "border-accent bg-accent/10 text-white" : "border-border text-muted"}`}>
                      {p.icon ?? "📦"} {p.name}
                    </button>
                  );
                })}
              </div>
            </details>
          )}

          {/* Scelta manuale domande */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted flex-1">
              📝 Domande: {manualComplete ? `✓ ${manualSel.length} selezionate` : manualSel.length > 0 ? `${manualSel.length}/${totalQuestions} selezionate` : "Casuale (usa filtri)"}
            </span>
            <button type="button" onClick={onOpenManualPicker}
              className={`px-3 py-1 rounded text-xs ${manualComplete ? "bg-accent/20 text-accent" : "border border-border text-muted hover:text-white"}`}>
              {manualComplete ? "Modifica" : "Scegli"}
            </button>
            {manualSel.length > 0 && (
              <button type="button" onClick={() => onChange({ manualQuestionIds: [] })} className="text-danger text-xs hover:underline">Reset</button>
            )}
          </div>

          {/* ── Opzioni filtrate dalla capability matrix ── */}
          <div className="border-t border-border/40 pt-2 space-y-2">
            <p className="text-xs text-muted">Opzioni di gioco (compatibili col tipo selezionato)</p>

            {/* Speedrun */}
            {compat.speedrun && (
              <div>
                <button type="button"
                  onClick={() => onChange({ speedrun: round.speedrun ? null : 60 })}
                  className={`w-full p-2 rounded border text-left text-xs ${round.speedrun ? "border-accent bg-accent/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                  ⚡ Speedrun {round.speedrun ? `· ${round.speedrun}s totali` : "· off"}
                </button>
                {round.speedrun && (
                  <div className="mt-1 flex gap-1">
                    {[30, 60, 90, 120, 180].map((s) => (
                      <button key={s} type="button" onClick={() => onChange({ speedrun: s })}
                        className={`flex-1 py-1 rounded text-[11px] border ${round.speedrun === s ? "border-accent bg-accent/10 text-white" : "border-border text-muted"}`}>{s}s</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lives - Caduta libera */}
            {compat.lives && (
              <div>
                <button type="button"
                  onClick={() => onChange({ lives: round.lives ? null : 3 })}
                  className={`w-full p-2 rounded border text-left text-xs ${round.lives ? "border-warning bg-warning/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                  🪜 Caduta libera {round.lives ? `· ${round.lives} vite` : "· off"}
                </button>
                {round.lives && (
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => onChange({ lives: n })}
                        className={`flex-1 py-1 rounded text-[11px] border ${round.lives === n ? "border-warning bg-warning/10 text-white" : "border-border text-muted"}`}>{"❤️".repeat(n)}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Last man standing */}
            {compat.lastManStanding && (
              <button type="button"
                onClick={() => onChange({ lastManStanding: !round.lastManStanding })}
                className={`w-full p-2 rounded border text-left text-xs ${round.lastManStanding ? "border-danger bg-danger/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                🏃 Ultimo in piedi {round.lastManStanding && "· attivo"}
              </button>
            )}

            {/* Category pick */}
            {compat.categoryPick && (
              <button type="button"
                onClick={() => onChange({ categoryPick: !round.categoryPick, jeopardy: false })}
                className={`w-full p-2 rounded border text-left text-xs ${round.categoryPick ? "border-gold bg-gold/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                🎯 Scegli categoria {round.categoryPick && "· attivo"}
              </button>
            )}

            {/* Jeopardy (solo OPEN_ANSWER) */}
            {compat.jeopardy && (
              <button type="button"
                onClick={() => onChange({ jeopardy: !round.jeopardy, categoryPick: false })}
                className={`w-full p-2 rounded border text-left text-xs ${round.jeopardy ? "border-gold bg-gold/10 text-white" : "border-border text-muted hover:border-muted"}`}>
                🎯 Jeopardy {round.jeopardy && "· attivo"}
              </button>
            )}

            {/* Aiuti — non disponibili in modalità presentatore */}
            {!localPartyMode && (compat.fiftyFifty || compat.skip) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {compat.fiftyFifty && (
                  <div>
                    <p className="text-[11px] text-muted mb-1">🎯 50/50 ×{round.fiftyFifty ?? 0}</p>
                    <input type="range" min={0} max={5} step={1}
                      value={round.fiftyFifty ?? 0}
                      onChange={(e) => onChange({ fiftyFifty: Number(e.target.value) })}
                      className="w-full accent-accent" />
                  </div>
                )}
                {compat.skip && (
                  <div>
                    <p className="text-[11px] text-muted mb-1">⏭ Salto ×{round.skip ?? 0}</p>
                    <input type="range" min={0} max={5} step={1}
                      value={round.skip ?? 0}
                      onChange={(e) => onChange({ skip: Number(e.target.value) })}
                      className="w-full accent-accent" />
                  </div>
                )}
              </div>
            )}

            {/* PlayMode override per round */}
            {!localPartyMode && (
              <div>
                <p className="text-[11px] text-muted mb-1">Modalità giocatori (override round)</p>
                <div className="grid grid-cols-3 gap-1">
                  <button type="button" onClick={() => onChange({ playMode: undefined })}
                    className={`py-1 rounded border text-[11px] ${!round.playMode ? "border-accent bg-accent/10 text-white" : "border-border text-muted"}`}>
                    eredita
                  </button>
                  <button type="button" onClick={() => onChange({ playMode: "FREE_FOR_ALL" })}
                    className={`py-1 rounded border text-[11px] ${round.playMode === "FREE_FOR_ALL" ? "border-accent bg-accent/10 text-white" : "border-border text-muted"}`}>
                    🥊 Tutti
                  </button>
                  <button type="button" onClick={() => onChange({ playMode: "TURN_BASED" })}
                    className={`py-1 rounded border text-[11px] ${round.playMode === "TURN_BASED" ? "border-accent bg-accent/10 text-white" : "border-border text-muted"}`}>
                    🔁 A turno
                  </button>
                </div>
                {round.playMode === "TURN_BASED" && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer text-[11px]">
                    <input type="checkbox" checked={round.passOnWrong ?? false}
                      onChange={(e) => onChange({ passOnWrong: e.target.checked })}
                      className="w-3 h-3 accent-accent" />
                    <span>Se sbaglia passa al successivo</span>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
