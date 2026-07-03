"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Input, Logo } from "@/components/ui";
import { RoundEditor } from "@/components/config/RoundEditor";
import {
  newRound,
  type CatNode,
  type PackOption,
  type RoundDraft,
} from "@/components/config/types";
import { setHostGameId, setHostToken } from "@/components/host/hostIdentity";
import { cn } from "@/lib/utils";
import { TOURNAMENT_MAX_ROUNDS, TOURNAMENT_MIN_ROUNDS } from "@/lib/roundsConfig";
import type { DifficultyFilter, PlayMode } from "@/types/game";

const DIFFICULTIES: Array<{ id: DifficultyFilter; label: string }> = [
  { id: "ALL", label: "Tutte" },
  { id: "EASY", label: "Facile" },
  { id: "MEDIUM", label: "Media" },
  { id: "HARD", label: "Difficile" },
];

export default function HostConfigPage() {
  const router = useRouter();

  const [hostName, setHostName] = useState("");
  const [isTournament, setIsTournament] = useState(false);
  const [rounds, setRounds] = useState<RoundDraft[]>([newRound()]);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("ALL");
  const [playMode, setPlayMode] = useState<PlayMode>("FREE_FOR_ALL");
  const [passOnWrong, setPassOnWrong] = useState(false);
  const [questionsPerRound, setQuestionsPerRound] = useState(5);
  const [localPartyMode, setLocalPartyMode] = useState(false);

  const [categoryTree, setCategoryTree] = useState<CatNode[]>([]);
  const [packs, setPacks] = useState<PackOption[] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica categorie (pubblico) e pack (solo se admin → altrimenti 401 → null).
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategoryTree(Array.isArray(d.tree) ? d.tree : []))
      .catch(() => setCategoryTree([]));

    fetch("/api/admin/packs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.packs) {
          setPacks(null);
          return;
        }
        setPacks(
          d.packs.map((p: { id: string; name: string; icon: string | null; color: string | null; _count?: { questions: number } }) => ({
            id: p.id,
            name: p.name,
            icon: p.icon,
            color: p.color,
            count: p._count?.questions ?? 0,
          })),
        );
      })
      .catch(() => setPacks(null));
  }, []);

  const effectiveRounds = useMemo(
    () => (isTournament ? rounds : rounds.slice(0, 1)),
    [isTournament, rounds],
  );

  const updateRound = (i: number, r: RoundDraft) =>
    setRounds((prev) => prev.map((x, idx) => (idx === i ? r : x)));

  const addRound = () =>
    setRounds((prev) =>
      prev.length >= TOURNAMENT_MAX_ROUNDS ? prev : [...prev, newRound()],
    );

  const removeRound = (i: number) =>
    setRounds((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const setMode = (tournament: boolean) => {
    setIsTournament(tournament);
    if (tournament && rounds.length < TOURNAMENT_MIN_ROUNDS) {
      setRounds((prev) => {
        const next = [...prev];
        while (next.length < TOURNAMENT_MIN_ROUNDS) next.push(newRound());
        return next;
      });
    }
  };

  // Validazione: i round manuali devono avere esattamente questionsPerRound domande.
  const manualErrors = effectiveRounds
    .map((r, i) =>
      r.sourceMode === "manual" && r.manualQuestionIds.length !== questionsPerRound ? i + 1 : null,
    )
    .filter((x): x is number => x !== null);

  const canSubmit =
    questionsPerRound >= 1 &&
    effectiveRounds.length >= 1 &&
    manualErrors.length === 0 &&
    !submitting;

  async function submit() {
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);

    const roundsConfig = effectiveRounds.map((r) => ({
      id: r.id,
      type: r.type,
      timeLimit: r.timeLimit,
      pointsExact: r.pointsExact,
      pointsWrong: r.pointsWrong,
      categoryIds: r.sourceMode === "categories" ? r.categoryIds : undefined,
      packIds: r.sourceMode === "pack" ? r.packIds : undefined,
      manualQuestionIds: r.sourceMode === "manual" ? r.manualQuestionIds : undefined,
      categoryPick: r.categoryPick,
      jeopardy: r.jeopardy,
      playMode,
      passOnWrong,
    }));

    const anyJeopardy = effectiveRounds.some((r) => r.jeopardy);
    const anyCategoryPick = effectiveRounds.some((r) => r.categoryPick);

    const body = {
      hostName: hostName.trim() || undefined,
      difficulty,
      totalQuestions: questionsPerRound,
      questionType: effectiveRounds[0].type,
      tournamentModes: effectiveRounds.map((r) => r.type),
      tournamentTimeLimits: effectiveRounds.map((r) => r.timeLimit),
      timeLimitOverride: isTournament ? null : effectiveRounds[0].timeLimit,
      pointsOverrides: effectiveRounds.map((r) => r.pointsExact),
      tournamentCategoryIds: effectiveRounds.map((r) =>
        r.sourceMode === "categories" ? r.categoryIds : [],
      ),
      manualQuestionIds: effectiveRounds.map((r) =>
        r.sourceMode === "manual" ? r.manualQuestionIds : [],
      ),
      categoryPickMode: anyCategoryPick && !anyJeopardy,
      jeopardyMode: anyJeopardy,
      localPartyMode,
      playMode,
      passOnWrong,
      roundsConfig,
    };

    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { code: string; gameId: string; hostToken: string; error?: string }
        | null;
      if (!res.ok || !json?.gameId) {
        setSubmitting(false);
        setError(json?.error ?? "Creazione partita non riuscita");
        return;
      }
      setHostToken(json.gameId, json.hostToken);
      setHostGameId(json.gameId);
      router.push(`/host/${json.gameId}`);
    } catch {
      setSubmitting(false);
      setError("Rete non raggiungibile");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Logo size="lg" />
        <p className="text-muted">Configura la partita e vai in regia.</p>
      </div>

      <div className="space-y-6">
        {/* Nome */}
        <Card>
          <Input
            label="Nome partita / host"
            placeholder="Es. Serata Quiz"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
        </Card>

        {/* Formato */}
        <Card className="space-y-4">
          <p className="text-sm font-medium text-muted">Formato</p>
          <div className="grid grid-cols-2 gap-3">
            <FormatButton active={!isTournament} onClick={() => setMode(false)} title="Partita singola" subtitle="Un solo round" />
            <FormatButton active={isTournament} onClick={() => setMode(true)} title="Torneo" subtitle={`${TOURNAMENT_MIN_ROUNDS}–${TOURNAMENT_MAX_ROUNDS} round`} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Domande per round</p>
            <input
              type="number"
              className="input w-32"
              min={1}
              max={50}
              value={questionsPerRound}
              onChange={(e) => setQuestionsPerRound(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </div>
        </Card>

        {/* Round */}
        <div className="space-y-4">
          {effectiveRounds.map((r, i) => (
            <RoundEditor
              key={r.id}
              index={i}
              round={r}
              showRemove={isTournament && rounds.length > TOURNAMENT_MIN_ROUNDS}
              questionsPerRound={questionsPerRound}
              difficulty={difficulty}
              categoryTree={categoryTree}
              packs={packs}
              onChange={(nr) => updateRound(i, nr)}
              onRemove={() => removeRound(i)}
            />
          ))}
          {isTournament && rounds.length < TOURNAMENT_MAX_ROUNDS && (
            <Button variant="ghost" className="w-full" onClick={addRound}>
              + Aggiungi round
            </Button>
          )}
        </div>

        {/* Opzioni globali */}
        <Card className="space-y-5">
          <p className="font-display text-lg uppercase tracking-wide text-gold">Opzioni globali</p>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Difficoltà</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={cn(
                    "rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all",
                    difficulty === d.id ? "border-gold bg-gold/10 text-gold" : "border-line text-muted hover:text-white",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted">Modalità giocatori</p>
            <div className="grid grid-cols-2 gap-3">
              <FormatButton active={playMode === "FREE_FOR_ALL"} onClick={() => setPlayMode("FREE_FOR_ALL")} title="Tutti contro tutti" subtitle="Rispondono insieme" />
              <FormatButton active={playMode === "TURN_BASED"} onClick={() => setPlayMode("TURN_BASED")} title="A turni" subtitle="Uno alla volta" />
            </div>
            {playMode === "TURN_BASED" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={passOnWrong}
                  onChange={(e) => setPassOnWrong(e.target.checked)}
                  className="h-4 w-4 accent-gold"
                />
                Se sbaglia, la domanda passa al successivo
              </label>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-line bg-stage p-4">
            <input
              type="checkbox"
              checked={localPartyMode}
              onChange={(e) => setLocalPartyMode(e.target.checked)}
              className="h-5 w-5 accent-gold"
            />
            <span>
              <span className="block font-semibold text-white">Modalità presentatore</span>
              <span className="block text-sm text-muted">
                Niente dispositivi: aggiungi i giocatori a mano e giudichi a voce.
              </span>
            </span>
          </label>
        </Card>

        {manualErrors.length > 0 && (
          <p className="text-center text-sm text-warning">
            Round {manualErrors.join(", ")}: seleziona esattamente {questionsPerRound} domande.
          </p>
        )}
        {error && <p className="text-center text-sm text-lose">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <Chip tone="neutral">
            {effectiveRounds.length} round × {questionsPerRound} = {effectiveRounds.length * questionsPerRound} domande
          </Chip>
          <Button size="lg" onClick={submit} loading={submitting} disabled={!canSubmit}>
            Crea partita
          </Button>
        </div>
      </div>
    </main>
  );
}

function FormatButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border-2 p-4 text-left transition-all",
        active ? "border-gold bg-gold/10" : "border-line hover:border-white/30",
      )}
    >
      <span className="block font-semibold text-white">{title}</span>
      <span className="block text-sm text-muted">{subtitle}</span>
    </button>
  );
}
