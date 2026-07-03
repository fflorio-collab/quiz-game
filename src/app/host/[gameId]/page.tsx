"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CodeBadge, Button, Spinner } from "@/components/ui";
import { useGameChannel } from "@/hooks/useGameChannel";
import { useGameTick } from "@/hooks/useGameTick";
import { useSnapshot } from "@/hooks/useSnapshot";
import { useSound } from "@/hooks/useSound";
import { getHostToken } from "@/components/host/hostIdentity";
import { hostPost } from "@/components/host/hostFetch";
import { LobbyView } from "@/components/host/LobbyView";
import { QuestionView } from "@/components/host/QuestionView";
import { LocalPartyView } from "@/components/host/LocalPartyView";
import { JudgingView } from "@/components/host/JudgingView";
import { RevealView } from "@/components/host/RevealView";
import { CategoryPickView } from "@/components/host/CategoryPickView";
import { JeopardyView } from "@/components/host/JeopardyView";
import { PodiumView } from "@/components/host/PodiumView";
import type {
  CategoryGridData,
  Difficulty,
  GameStateSnapshot,
  GameStatus,
  JeopardyGridData,
  JudgeAnswersData,
  LocalRoundState,
  PlayerInfo,
  QuestionData,
  RevealData,
} from "@/types/game";

type Phase =
  | "lobby"
  | "question"
  | "judging"
  | "reveal"
  | "categoryPick"
  | "jeopardy"
  | "podium";

export default function HostConsolePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const { play } = useSound();

  const [hostToken, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Stato di gioco derivato da snapshot (recovery) + eventi live.
  const [gameStatus, setGameStatus] = useState<GameStatus>("LOBBY");
  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [judging, setJudging] = useState<JudgeAnswersData | null>(null);
  const [categoryGrid, setCategoryGrid] = useState<CategoryGridData | null>(null);
  const [jeopardyGrid, setJeopardyGrid] = useState<JeopardyGridData | null>(null);
  const [localState, setLocalState] = useState<LocalRoundState | null>(null);
  const [correctAnswerText, setCorrectAnswerText] = useState<string | null>(null);
  const [localPartyMode, setLocalPartyMode] = useState(false);
  const [finalRanking, setFinalRanking] = useState<PlayerInfo[] | null>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Legge il token host da localStorage dopo il mount.
  useEffect(() => {
    setToken(getHostToken(gameId));
    setTokenReady(true);
  }, [gameId]);

  // ── Recovery: snapshot al mount (e ad ogni refetch deliberato) ──────────────
  const snapParams = tokenReady
    ? ({ role: "host", gameId, hostToken: hostToken ?? "" } as const)
    : null;
  const { snapshot } = useSnapshot(snapParams);

  const applySnapshot = useCallback((s: GameStateSnapshot) => {
    setGameStatus(s.gameStatus);
    setCode(s.code);
    setPlayers(s.players);
    setLocalPartyMode(!!s.localPartyMode);
    if (s.correctAnswerText) setCorrectAnswerText(s.correctAnswerText);
    if (s.localState) setLocalState(s.localState);
    if (s.currentQuestion) setQuestion(s.currentQuestion);
    if (s.reveal) setReveal(s.reveal);
    if (s.judging) setJudging(s.judging);
    if (s.categoryGrid) setCategoryGrid(s.categoryGrid);
    if (s.jeopardyGrid) setJeopardyGrid(s.jeopardyGrid);

    if (s.gameStatus === "FINISHED") {
      setFinalRanking(s.finalRanking ?? s.players);
      setPhase("podium");
    } else if (s.gameStatus === "LOBBY") {
      setPhase("lobby");
    } else if (s.judging) {
      setPhase("judging");
    } else if (s.isRevealing && s.reveal) {
      setPhase("reveal");
    } else if (s.categoryGrid) {
      setPhase("categoryPick");
    } else if (s.jeopardyGrid) {
      setPhase("jeopardy");
    } else if (s.currentQuestion) {
      setPhase("question");
    } else {
      setPhase("lobby");
    }
  }, []);

  useEffect(() => {
    if (snapshot) applySnapshot(snapshot);
  }, [snapshot, applySnapshot]);

  // ── Realtime: canale partita + canale host ──────────────────────────────────
  useGameChannel(gameId, {
    hostToken,
    handlers: {
      "lobby:updated": (d) => setPlayers(d.players),
      "player:joined": (d) => {
        setPlayers((prev) =>
          prev.some((p) => p.id === d.player.id) ? prev : [...prev, d.player],
        );
        play("join");
      },
      "lobby:started": () => {
        setGameStatus("PLAYING");
        play("start");
      },
      "game:question": (q) => {
        setQuestion(q);
        setReveal(null);
        setJudging(null);
        setCategoryGrid(null);
        setJeopardyGrid(null);
        setAnsweredIds(new Set());
        setStarting(false);
        setPhase("question");
      },
      "game:turn": (t) => {
        setQuestion((prev) =>
          prev && prev.gameQuestionId === t.gameQuestionId
            ? { ...prev, turnPlayerId: t.turnPlayerId, turnPlayerNickname: t.turnPlayerNickname }
            : prev,
        );
      },
      "game:answer-received": (d) => {
        setAnsweredIds((prev) => {
          const next = new Set(prev);
          next.add(d.playerId);
          return next;
        });
      },
      "game:judge-answers": (j) => {
        setJudging(j);
        setStarting(false);
        setPhase("judging");
      },
      "game:reveal": (r) => {
        setReveal(r);
        setStarting(false);
        setPhase("reveal");
        play(r.playerResults.some((p) => p.wasCorrect) ? "correct" : "wrong");
      },
      "game:leaderboard": (d) => setPlayers(d.players),
      "game:category-grid": (g) => {
        setCategoryGrid(g);
        setQuestion(null);
        setStarting(false);
        setPhase("categoryPick");
      },
      "game:jeopardy-grid": (g) => {
        setJeopardyGrid(g);
        setQuestion(null);
        setStarting(false);
        setPhase("jeopardy");
      },
      "game:finished": (d) => {
        setFinalRanking(d.players);
        setGameStatus("FINISHED");
        setStarting(false);
        setPhase("podium");
        play("finish");
      },
      "game:local-state": (s) => setLocalState(s),
      "game:local-host-info": (d) => setCorrectAnswerText(d.correctAnswerText),
      error: (e) => setBanner(e.message),
    },
  });

  // ── Timer domanda + suono tick ──────────────────────────────────────────────
  const tick = useGameTick(gameId, { intervalMs: 1000, enabled: phase === "question" });
  const prevRem = useRef<number | null>(null);
  useEffect(() => {
    const r = tick.remaining;
    if (r !== null && r > 0 && r <= 5 && r !== prevRem.current) play("tick");
    prevRem.current = r;
  }, [tick.remaining, play]);

  // ── Azioni host ─────────────────────────────────────────────────────────────
  const run = useCallback(
    async (path: string, body?: unknown, opts?: { starting?: boolean }) => {
      setBanner(null);
      if (opts?.starting) setStarting(true);
      else setBusy(true);
      const res = await hostPost(gameId, path, body);
      setBusy(false);
      if (!res.ok) {
        if (opts?.starting) setStarting(false);
        setBanner(res.error ?? "Azione non riuscita");
      }
      return res.ok;
    },
    [gameId],
  );

  const onStart = () => run("/start", undefined, { starting: true });
  const onEnd = () => run("/end-question");
  const onNext = () => run("/next");
  const onJudge = (judgments: Array<{ playerId: string; isCorrect: boolean }>) =>
    run("/judge", { judgments });
  const onCategoryPick = (categoryId: string, difficulty?: Difficulty) =>
    run("/category-pick", { categoryId, difficulty });
  const onJeopardyPick = (gameQuestionId: string) =>
    run("/jeopardy-pick", { gameQuestionId });
  const onLocalJudge = (playerId: string, isCorrect: boolean) =>
    run("/local-judge", { playerId, isCorrect });
  const onLocalTurn = (playerId: string | null) => run("/local-turn", { playerId });

  const activeCount = players.filter((p) => !p.eliminated).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (!tokenReady || (!code && !snapshot)) {
    body = (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  } else if (phase === "podium") {
    body = <PodiumView players={finalRanking ?? players} />;
  } else if (phase === "categoryPick" && categoryGrid) {
    body = <CategoryPickView grid={categoryGrid} busy={busy} onPick={onCategoryPick} />;
  } else if (phase === "jeopardy" && jeopardyGrid) {
    body = <JeopardyView grid={jeopardyGrid} busy={busy} onPick={onJeopardyPick} />;
  } else if (phase === "judging" && judging) {
    body = (
      <JudgingView
        judging={judging}
        correctAnswerText={correctAnswerText}
        busy={busy}
        onConfirm={onJudge}
      />
    );
  } else if (phase === "reveal" && reveal) {
    body = <RevealView reveal={reveal} players={players} advancing={busy} onNext={onNext} />;
  } else if (phase === "question" && question) {
    body = localPartyMode ? (
      <LocalPartyView
        question={question}
        players={players}
        localState={localState}
        correctAnswerText={correctAnswerText}
        remaining={tick.remaining}
        ending={busy}
        onSetTurn={onLocalTurn}
        onJudge={onLocalJudge}
        onEnd={onEnd}
      />
    ) : (
      <QuestionView
        question={question}
        remaining={tick.remaining}
        answered={answeredIds.size}
        total={activeCount}
        ending={busy}
        onEnd={onEnd}
      />
    );
  } else {
    body = (
      <LobbyView
        gameId={gameId}
        code={code}
        players={players}
        playMode="FREE_FOR_ALL"
        localPartyMode={localPartyMode}
        starting={starting}
        onStart={onStart}
      />
    );
  }

  return (
    <main className="min-h-dvh">
      {/* Barra di regia */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-ink/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {code && <CodeBadge code={code} size="inline" />}
          <span className="text-xs uppercase tracking-widest text-muted">
            {gameStatus === "PLAYING" ? phase : gameStatus.toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!hostToken && (
            <span className="rounded-full bg-lose/15 px-3 py-1 text-xs text-lose">
              Nessun token host su questo dispositivo
            </span>
          )}
          {gameStatus === "PLAYING" && phase !== "podium" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Terminare la partita adesso?")) run("/finish");
              }}
            >
              Termina partita
            </Button>
          )}
        </div>
      </div>

      {banner && (
        <div className="bg-lose/15 px-5 py-2 text-center text-sm text-lose">{banner}</div>
      )}

      {body}
    </main>
  );
}
