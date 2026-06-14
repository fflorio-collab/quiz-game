"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePusherChannel } from "@/lib/pusher-client";
import { useGameTick } from "@/lib/use-game-tick";
import { playSound } from "@/lib/sound";
import type {
  PlayerInfo,
  QuestionData,
  RevealData,
  JudgeAnswersData,
  JeopardyGridData,
  DuelState,
  LocalRoundState,
  CategoryGridData,
} from "@/types/socket";
import MediaDisplay from "@/components/MediaDisplay";

type Phase = "LOBBY" | "QUESTION" | "JUDGING" | "REVEAL" | "FINISHED" | "JEOPARDY_GRID" | "CATEGORY_PICK";

export default function HostLobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  // Migration vercel-pusher fase 7.6: due canali — game (eventi pubblici) + host (info riservate).
  const gameChannel = usePusherChannel(gameId ? `game-${gameId}` : null);
  const hostChannel = usePusherChannel(gameId ? `host-${gameId}` : null);
  // Fase 8: polling tick — l'host è il principale candidato a innescare la
  // fine-domanda automatica (ma il server è idempotente quindi qualunque
  // client può triggerare). Intervallo 1s per UX più reattiva sulla pagina host.
  const tick = useGameTick(gameId ?? null, { intervalMs: 1000 });

  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  // Modalità a turni: chi è di turno sulla domanda corrente (null = FREE_FOR_ALL).
  const [turnPlayerId, setTurnPlayerId] = useState<string | null>(null);
  const [turnPlayerNickname, setTurnPlayerNickname] = useState<string | null>(null);
  const [finalRanking, setFinalRanking] = useState<PlayerInfo[]>([]);
  const [judgeData, setJudgeData] = useState<JudgeAnswersData | null>(null);
  const [judgments, setJudgments] = useState<Record<string, boolean>>({});
  const [speedrunRemaining, setSpeedrunRemaining] = useState<number | null>(null);
  const [livesAllowed, setLivesAllowed] = useState<number | null>(null);
  const [jeopardyGrid, setJeopardyGrid] = useState<JeopardyGridData | null>(null);
  // 100 Secondi
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [duelAnswer, setDuelAnswer] = useState<string>(""); // soluzione domanda corrente (solo host)
  const [duelEnded, setDuelEnded] = useState<{ winnerNickname: string; loserNickname: string } | null>(null);
  const [showDuelPicker, setShowDuelPicker] = useState(false);
  const [duelPickA, setDuelPickA] = useState<string>("");
  const [duelPickB, setDuelPickB] = useState<string>("");
  const [duelDuration, setDuelDuration] = useState(100);
  // Modalità presentatore
  const [localPartyMode, setLocalPartyMode] = useState(false);
  const [localJudgments, setLocalJudgments] = useState<Record<string, boolean | null>>({});
  const [localCorrectAnswer, setLocalCorrectAnswer] = useState<string>("");
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [addPlayerName, setAddPlayerName] = useState("");
  const [addPlayerEmoji, setAddPlayerEmoji] = useState("🎮");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState("");
  // "Scegli categoria"
  const [categoryPickMode, setCategoryPickMode] = useState(false);
  const [categoryGrid, setCategoryGrid] = useState<CategoryGridData | null>(null);
  const [pickPending, setPickPending] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hostCode");
    if (saved) setCode(saved);
  }, []);

  // Countdown locale 1s tra i tick polling per animazione fluida.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (phase !== "QUESTION" || !question || question.timeLimit <= 0) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        const next = r > 0 ? r - 1 : 0;
        if (next > 0 && next <= 5) playSound("tick");
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, question]);

  // Countdown locale speedrun.
  const speedrunRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (speedrunRef.current) clearInterval(speedrunRef.current);
    if (speedrunRemaining === null || speedrunRemaining <= 0) return;
    speedrunRef.current = setInterval(() => {
      setSpeedrunRemaining((r) => (r !== null && r > 0 ? r - 1 : r));
    }, 1000);
    return () => {
      if (speedrunRef.current) clearInterval(speedrunRef.current);
    };
  }, [speedrunRemaining !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fase 8: sincronizza i timer + duel dal tick server (autoritativo).
  useEffect(() => {
    if (!tick) return;
    if (tick.questionRemaining !== null && phase === "QUESTION") {
      setRemaining(tick.questionRemaining);
    }
    if (tick.speedrunRemaining !== speedrunRemaining) {
      setSpeedrunRemaining(tick.speedrunRemaining);
    }
    if (tick.duel) setDuel(tick.duel);
  }, [tick, phase, speedrunRemaining]);

  // Rejoin via POST /api/game/[id]/snapshot (fase 7.4). Recupera anche duel:host-info.
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/game/${gameId}/snapshot`, { method: "POST" });
        const res = await r.json();
        if (cancelled) return;
        if (!r.ok || !res.success) {
          localStorage.removeItem("hostGameId");
          localStorage.removeItem("hostCode");
          alert(res.error || "Impossibile riconnettersi alla partita");
          router.push("/");
          return;
        }
        const s = res.state;
        if (s.code) setCode(s.code);
        setPlayers(s.players);
        if (typeof s.speedrunRemaining === "number") setSpeedrunRemaining(s.speedrunRemaining);
        if (s.livesAllowed) setLivesAllowed(s.livesAllowed);
        if (s.jeopardyGrid) setJeopardyGrid(s.jeopardyGrid);
        if (s.duel && !s.duel.finished) setDuel(s.duel);
        if (s.localPartyMode) setLocalPartyMode(true);
        if (s.localState) {
          setLocalJudgments(s.localState.judgments);
          setActivePlayerId(s.localState.activePlayerId ?? null);
        }
        if (s.correctAnswerText) setLocalCorrectAnswer(s.correctAnswerText);
        if (s.categoryPickMode) setCategoryPickMode(true);
        if (s.categoryGrid) setCategoryGrid(s.categoryGrid);
        if (s.gameStatus === "FINISHED") {
          setFinalRanking(s.finalRanking ?? s.players);
          setPhase("FINISHED");
          return;
        }
        if (s.gameStatus === "LOBBY") {
          setPhase("LOBBY");
          return;
        }
        if (s.categoryGrid) {
          setPhase("CATEGORY_PICK");
        } else if (s.jeopardyGrid) {
          setPhase("JEOPARDY_GRID");
        } else if (s.judging) {
          setJudgeData(s.judging);
          const initial: Record<string, boolean> = {};
          s.judging.answers.forEach((a: { playerId: string }) => { initial[a.playerId] = false; });
          setJudgments(initial);
          setPhase("JUDGING");
        } else if (s.isRevealing && s.reveal) {
          setReveal(s.reveal);
          setPhase("REVEAL");
        } else if (s.currentQuestion) {
          setQuestion(s.currentQuestion);
          setTurnPlayerId(s.currentQuestion.turnPlayerId ?? null);
          setTurnPlayerNickname(s.currentQuestion.turnPlayerNickname ?? null);
          setRemaining(s.remainingTime ?? s.currentQuestion.timeLimit);
          setReveal(null);
          setJudgeData(null);
          setPhase("QUESTION");
        }
      } catch (e) {
        if (cancelled) return;
        alert(e instanceof Error ? e.message : "Errore di rete");
        router.push("/");
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, router]);

  // Listener canale pubblico game-{gameId}.
  useEffect(() => {
    if (!gameChannel) return;

    const onLobbyUpdated = ({ players }: { players: PlayerInfo[] }) => {
      setPlayers((prev) => {
        if (players.length > prev.length) playSound("join");
        return players;
      });
    };
    const onLobbyStarted = () => {
      playSound("start");
      setPhase("QUESTION");
    };
    const onGameQuestion = (q: QuestionData) => {
      setQuestion(q);
      setTurnPlayerId(q.turnPlayerId ?? null);
      setTurnPlayerNickname(q.turnPlayerNickname ?? null);
      setReveal(null);
      setJudgeData(null);
      setJudgments({});
      setAnsweredCount(0);
      setRemaining(q.timeLimit);
      setLocalJudgments({});
      setLocalCorrectAnswer("");
      setCategoryGrid(null);
      setPhase("QUESTION");
    };
    // Modalità a turni: cambio del giocatore di turno (staffetta passOnWrong).
    const onTurn = (data: { turnPlayerId: string | null; turnPlayerNickname: string | null; remainingTime: number }) => {
      setTurnPlayerId(data.turnPlayerId);
      setTurnPlayerNickname(data.turnPlayerNickname);
      if (data.remainingTime > 0) setRemaining(data.remainingTime);
    };
    const onJeopardyGrid = (data: JeopardyGridData) => {
      setJeopardyGrid(data);
      setPhase("JEOPARDY_GRID");
    };
    const onCategoryGrid = (data: CategoryGridData) => {
      setCategoryGrid(data);
      setPickPending(false);
      setPhase("CATEGORY_PICK");
    };
    const onAnswerReceived = () => setAnsweredCount((c) => c + 1);
    const onJudgeAnswers = (data: JudgeAnswersData) => {
      setJudgeData(data);
      const initial: Record<string, boolean> = {};
      data.answers.forEach((a) => { initial[a.playerId] = false; });
      setJudgments(initial);
      setPhase("JUDGING");
    };
    const onReveal = (data: RevealData) => {
      setReveal(data);
      setPhase("REVEAL");
    };
    const onLeaderboard = ({ players }: { players: PlayerInfo[] }) => setPlayers(players);
    const onFinished = ({ players }: { players: PlayerInfo[] }) => {
      playSound("finish");
      setFinalRanking(players);
      setPhase("FINISHED");
    };
    const onDuelState = (st: DuelState) => setDuel(st);
    const onDuelEnded = ({ winnerNickname, loserNickname }: { winnerNickname: string; loserNickname: string }) => {
      setDuelEnded({ winnerNickname, loserNickname });
      setTimeout(() => { setDuelEnded(null); setDuel(null); setDuelAnswer(""); }, 5000);
    };
    const onLocalState = (s: LocalRoundState) => {
      setLocalJudgments(s.judgments);
      setActivePlayerId(s.activePlayerId ?? null);
    };

    gameChannel.bind("lobby:updated", onLobbyUpdated);
    gameChannel.bind("lobby:started", onLobbyStarted);
    gameChannel.bind("game:question", onGameQuestion);
    gameChannel.bind("game:turn", onTurn);
    gameChannel.bind("game:jeopardy-grid", onJeopardyGrid);
    gameChannel.bind("game:category-grid", onCategoryGrid);
    gameChannel.bind("game:answer-received", onAnswerReceived);
    gameChannel.bind("game:judge-answers", onJudgeAnswers);
    gameChannel.bind("game:reveal", onReveal);
    gameChannel.bind("game:leaderboard", onLeaderboard);
    gameChannel.bind("game:finished", onFinished);
    gameChannel.bind("duel:state", onDuelState);
    gameChannel.bind("duel:ended", onDuelEnded);
    gameChannel.bind("game:local-state", onLocalState);

    return () => {
      gameChannel.unbind("lobby:updated", onLobbyUpdated);
      gameChannel.unbind("lobby:started", onLobbyStarted);
      gameChannel.unbind("game:question", onGameQuestion);
      gameChannel.unbind("game:turn", onTurn);
      gameChannel.unbind("game:jeopardy-grid", onJeopardyGrid);
      gameChannel.unbind("game:category-grid", onCategoryGrid);
      gameChannel.unbind("game:answer-received", onAnswerReceived);
      gameChannel.unbind("game:judge-answers", onJudgeAnswers);
      gameChannel.unbind("game:reveal", onReveal);
      gameChannel.unbind("game:leaderboard", onLeaderboard);
      gameChannel.unbind("game:finished", onFinished);
      gameChannel.unbind("duel:state", onDuelState);
      gameChannel.unbind("duel:ended", onDuelEnded);
      gameChannel.unbind("game:local-state", onLocalState);
    };
  }, [gameChannel]);

  // Listener canale riservato host-{gameId}: soluzioni domanda e info host-only.
  useEffect(() => {
    if (!hostChannel) return;
    const onDuelHostInfo = ({ correctAnswer }: { correctAnswer: string }) => setDuelAnswer(correctAnswer);
    const onLocalHostInfo = ({ correctAnswerText }: { correctAnswerText: string }) => setLocalCorrectAnswer(correctAnswerText);
    hostChannel.bind("duel:host-info", onDuelHostInfo);
    hostChannel.bind("game:local-host-info", onLocalHostInfo);
    return () => {
      hostChannel.unbind("duel:host-info", onDuelHostInfo);
      hostChannel.unbind("game:local-host-info", onLocalHostInfo);
    };
  }, [hostChannel]);

  // Helper minimo per chiamare un POST sull'API del gioco; fire-and-forget per le azioni
  // semplici (start/next/end-question/jeopardy-pick/finish/judge): il client riceve la
  // risposta tramite Pusher, quindi qui ignoriamo la response salvo errori.
  const postGame = async (path: string, body?: object) => {
    try {
      await fetch(`/api/game/${gameId}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch { /* silent */ }
  };

  const startGame = () => postGame("/start");
  const nextQuestion = () => postGame("/next");
  const endQuestion = () => postGame("/end-question");
  const pickCell = (gameQuestionId: string) => postGame("/jeopardy-pick", { gameQuestionId });
  const playAgain = () => router.push("/host");

  const addLocalPlayer = async () => {
    const name = addPlayerName.trim();
    if (!name) { setAddPlayerError("Inserisci un nickname"); return; }
    setAddingPlayer(true);
    setAddPlayerError("");
    try {
      const r = await fetch(`/api/game/${gameId}/local-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: name, emoji: addPlayerEmoji }),
      });
      const res = await r.json();
      if (!r.ok) { setAddPlayerError(res.error || "Errore"); return; }
      setAddPlayerName("");
    } catch (e) {
      setAddPlayerError(e instanceof Error ? e.message : "Errore di rete");
    } finally {
      setAddingPlayer(false);
    }
  };

  const removeLocalPlayer = (playerId: string) => {
    fetch(`/api/game/${gameId}/local-player/${playerId}`, { method: "DELETE" }).catch(() => {});
  };
  const localJudge = (playerId: string, isCorrect: boolean) => postGame("/local-judge", { playerId, isCorrect });
  const setLocalTurn = (playerId: string | null) => postGame("/local-turn", { playerId });
  const pickCategory = async (categoryId: string, difficulty?: string) => {
    if (pickPending) return;
    setPickPending(true);
    try {
      const r = await fetch(`/api/game/${gameId}/category-pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, difficulty }),
      });
      // 409 (scelta già in corso / categoria esaurita) o errore → riabilita i bottoni.
      // Sul successo la fase passa a QUESTION via game:question e la griglia si smonta.
      if (!r.ok) setPickPending(false);
    } catch {
      setPickPending(false);
    }
  };
  const finishGameEarly = () => {
    if (!window.confirm("Terminare la partita ora? La classifica finale verrà calcolata con i punti attuali.")) return;
    postGame("/finish");
  };

  const submitJudgments = () => {
    if (!judgeData) return;
    const list = Object.entries(judgments).map(([playerId, isCorrect]) => ({ playerId, isCorrect }));
    postGame("/judge", { judgments: list });
  };

  const startDuel = async () => {
    if (!duelPickA || !duelPickB || duelPickA === duelPickB) return;
    try {
      const r = await fetch(`/api/game/${gameId}/duel/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerAId: duelPickA, playerBId: duelPickB, durationSec: duelDuration }),
      });
      const res = await r.json();
      if (!r.ok) { alert(res.error || "Errore"); return; }
      setShowDuelPicker(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore di rete");
    }
  };
  const stopDuel = () => { fetch(`/api/game/${gameId}/duel/stop`, { method: "POST" }).catch(() => {}); };
  const toggleDuelPause = () => {
    if (!duel) return;
    fetch(`/api/game/${gameId}/duel/pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: !duel.paused }),
    }).catch(() => {});
  };
  const judgeDuel = (isCorrect: boolean) => {
    fetch(`/api/game/${gameId}/duel/judge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCorrect }),
    }).catch(() => {});
  };

  // === RENDER ===

  // 100 Secondi: il duello prevale su qualsiasi fase
  if (duel && !duel.finished) {
    const fmt = (ms: number) => (ms / 1000).toFixed(1);
    const pct = (ms: number) => Math.max(0, Math.min(100, (ms / (duel.durationSec * 1000)) * 100));
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="chip-gold inline-flex mb-2">⏱ 100 Secondi</div>
            <h2 className="text-3xl font-bold">Duello in corso</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[duel.playerA, duel.playerB].map((p) => {
              const isActive = p.id === duel.activePlayerId;
              return (
                <div key={p.id} className={`card ${isActive ? "border-accent shadow-lg" : "opacity-70"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : <span className="text-4xl">{p.emoji || "🎮"}</span>}
                    <div>
                      <p className="font-bold text-lg">{p.nickname}</p>
                      {isActive && <p className="text-xs text-accent">🎤 Risponde</p>}
                    </div>
                  </div>
                  <div className="text-5xl font-bold tabular-nums text-accent">{fmt(p.timeLeftMs)}<span className="text-xl text-muted">s</span></div>
                  <div className="h-3 bg-surface rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-accent transition-all duration-200" style={{ width: `${pct(p.timeLeftMs)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card mb-4 text-center">
            <p className="text-sm text-muted mb-1">Domanda</p>
            <p className="text-2xl font-semibold mb-3">{duel.question?.text ?? "—"}</p>
            {duel.question && (
              <>
                <p className="text-xs text-muted mb-1">Parola di {duel.question.length} lettere</p>
                <p className="text-3xl font-bold tracking-[0.3em] tabular-nums mb-2">{duel.question.masked}</p>
                {duelAnswer && (
                  <p className="text-sm text-gold">🔒 Soluzione: <b>{duelAnswer}</b></p>
                )}
              </>
            )}
          </div>

          {duel.question && (
            <div className="card mb-4 text-center border-gold">
              <p className="text-sm text-muted mb-3">Giudica la risposta detta a voce</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => judgeDuel(true)}
                  className="btn-primary flex-1 text-lg py-4"
                >✓ Corretta</button>
                <button
                  onClick={() => judgeDuel(false)}
                  className="btn-secondary flex-1 text-lg py-4"
                >✗ Sbagliata / non sa</button>
              </div>
            </div>
          )}

          {duel.lastResult && (
            <div className={`card mb-4 text-center ${duel.lastResult.correct ? "border-success" : "border-danger"}`}>
              <p className="text-sm text-muted">Turno precedente</p>
              <p className="text-lg">
                {duel.lastResult.correct ? "✓ corretta" : `✗ era: ${duel.lastResult.correctAnswer}`}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={toggleDuelPause}
              className={`flex-1 py-3 rounded-lg border-2 font-semibold ${duel.paused ? "border-success text-success bg-success/10" : "border-warning text-warning bg-warning/10"}`}
            >
              {duel.paused ? "▶ Riprendi" : "⏸ Pausa"}
            </button>
            <button onClick={stopDuel} className="btn-secondary flex-1">Ferma duello</button>
          </div>
        </div>
      </main>
    );
  }

  if (duelEnded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-slide-up">
          <div className="text-8xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold mb-2">Vince {duelEnded.winnerNickname}</h2>
          <p className="text-muted">Eliminato: {duelEnded.loserNickname}</p>
        </div>
      </main>
    );
  }

  // CATEGORY PICK: l'host sceglie una categoria; il server pesca a sorte una domanda rimanente di quella categoria
  if (phase === "CATEGORY_PICK" && categoryGrid) {
    const availableCats = categoryGrid.categories.filter((c) => c.remaining > 0);
    const totalRemaining = availableCats.reduce((sum, c) => sum + c.remaining, 0);
    const DIFFICULTY_META: Record<string, { label: string; emoji: string; cls: string }> = {
      EASY: { label: "Facile", emoji: "🟢", cls: "border-success/50 bg-success/10 text-success" },
      MEDIUM: { label: "Medio", emoji: "🟡", cls: "border-gold/50 bg-gold/10 text-gold" },
      HARD: { label: "Difficile", emoji: "🔴", cls: "border-danger/50 bg-danger/10 text-danger" },
    };
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="chip-gold inline-flex mb-2">🎯 Scegli categoria</div>
            <h2 className="text-2xl md:text-3xl font-bold">Scegli la categoria della prossima domanda</h2>
            <p className="text-muted text-sm">
              {totalRemaining} domande rimaste · {availableCats.length} categorie disponibili
            </p>
            {categoryGrid.turnPlayerId && categoryGrid.turnPlayerNickname && (
              <div className="mt-3 inline-flex items-center gap-2 p-2 px-4 rounded-xl bg-gold/10 ring-1 ring-gold/40">
                <span className="text-sm text-muted">🎯 Tocca a</span>
                <span className="text-xl font-bold">{categoryGrid.turnPlayerNickname}</span>
                <span className="text-sm text-muted">scegliere la categoria</span>
              </div>
            )}
          </div>

          {/* Classifica compatta */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {players.slice(0, 8).map((p, i) => (
              <span key={p.id} className={`text-xs px-3 py-1 rounded-full border ${i === 0 ? "border-gold bg-gold/10" : "border-border"}`}>
                #{i + 1} {p.nickname} · {p.score}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {categoryGrid.categories.map((c) => {
              const diffs = c.difficulties ?? [];
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border-2 border-border bg-surface/40"
                  style={c.color ? { borderColor: `${c.color}66` } : undefined}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{c.icon || "🏷️"}</span>
                    <span className="font-bold truncate">{c.name}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {diffs.length === 0 && <span className="text-xs text-muted">Nessuna domanda</span>}
                    {diffs.map((d) => {
                      const meta = DIFFICULTY_META[d.difficulty] ?? { label: d.difficulty, emoji: "❓", cls: "border-border" };
                      return (
                        <button
                          key={d.difficulty}
                          onClick={() => !pickPending && pickCategory(c.id, d.difficulty)}
                          disabled={pickPending}
                          className={`flex items-center justify-between gap-2 p-2 px-3 rounded-lg border-2 transition-all ${meta.cls} ${pickPending ? "opacity-40 cursor-not-allowed" : "hover:brightness-125 active:scale-95"}`}
                        >
                          <span className="font-medium text-sm">{meta.emoji} {meta.label}</span>
                          <span className="font-bold text-sm">{d.points} pt</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={finishGameEarly} className="text-sm text-muted hover:text-danger w-full text-center py-2">
            ✋ Termina partita ora
          </button>
        </div>
      </main>
    );
  }

  // JEOPARDY GRID: l'host sceglie la cella da giocare
  if (phase === "JEOPARDY_GRID" && jeopardyGrid) {
    // Raggruppa celle per categoria (mantieni ordine di prima comparsa)
    const byCat = new Map<string, typeof jeopardyGrid.cells>();
    jeopardyGrid.cells.forEach((c) => {
      if (!byCat.has(c.categoryId)) byCat.set(c.categoryId, []);
      byCat.get(c.categoryId)!.push(c);
    });
    const categories = Array.from(byCat.entries());
    const remaining = jeopardyGrid.cells.filter((c) => !c.consumed).length;

    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <div className="chip-gold inline-flex mb-2">🎯 Jeopardy</div>
            <h2 className="text-2xl md:text-3xl font-bold">Scegli la cella</h2>
            <p className="text-muted text-sm">
              {remaining} celle rimaste · Clicca per giocare
            </p>
          </div>

          {/* Classifica veloce */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {players.slice(0, 6).map((p, i) => (
              <span key={p.id} className={`text-xs px-3 py-1 rounded-full border ${i === 0 ? "border-gold bg-gold/10" : "border-border"}`}>
                #{i + 1} {p.nickname} · {p.score}
              </span>
            ))}
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
            {/* Header categorie */}
            {categories.map(([catId, cells]) => (
              <div key={catId} className="p-3 rounded-lg text-center font-bold text-sm" style={{
                backgroundColor: `${cells[0].categoryColor}30`,
                color: cells[0].categoryColor || "#fff",
              }}>
                <div className="text-lg">{cells[0].categoryIcon}</div>
                {cells[0].categoryName}
              </div>
            ))}

            {/* Celle in righe (valore crescente) */}
            {categories[0] && categories[0][1].map((_, rowIdx) => (
              categories.map(([catId, cells]) => {
                const cell = cells[rowIdx];
                if (!cell) return <div key={`${catId}-${rowIdx}`} />;
                return (
                  <button
                    key={cell.gameQuestionId}
                    onClick={() => !cell.consumed && pickCell(cell.gameQuestionId)}
                    disabled={cell.consumed}
                    className={`aspect-square rounded-lg border-2 text-2xl md:text-3xl font-bold transition-all ${
                      cell.consumed
                        ? "border-border/30 bg-surface/30 text-muted/30 cursor-not-allowed"
                        : "border-gold bg-gold/10 text-gold hover:bg-gold/20 active:scale-95"
                    }`}
                  >
                    {cell.consumed ? "✓" : cell.value}
                  </button>
                );
              })
            ))}
          </div>

          {remaining === 0 && (
            <button onClick={nextQuestion} className="btn-primary w-full mt-6">
              Termina partita
            </button>
          )}
        </div>
      </main>
    );
  }

  if (phase === "FINISHED") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold">Partita terminata!</h1>
          </div>
          <div className="card space-y-3">
            {finalRanking.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  i === 0
                    ? "bg-warning/20 border border-warning"
                    : i === 1
                      ? "bg-border"
                      : i === 2
                        ? "bg-border/50"
                        : "bg-background"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold w-10">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <span className="text-2xl">{p.emoji || "🎮"}</span>
                  )}
                  <span className="text-lg font-semibold">{p.nickname}</span>
                </div>
                <span className="text-2xl font-bold text-accent">{p.score}</span>
              </div>
            ))}
          </div>
          <button onClick={playAgain} className="btn-primary w-full mt-6">
            Nuova partita
          </button>
        </div>
      </main>
    );
  }

  // JUDGING: host giudica le risposte aperte
  if (phase === "JUDGING" && judgeData) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            {question && (
              <div className="text-muted text-sm mb-1">
                Domanda {question.questionNumber} / {question.totalQuestions}
              </div>
            )}
            <h2 className="text-2xl font-bold mb-1">Giudica le risposte</h2>
            <p className="text-muted text-sm">
              Segna ogni risposta come corretta o sbagliata, poi conferma.
            </p>
          </div>

          {judgeData.answers.length === 0 ? (
            <div className="card text-center py-8 text-muted mb-6">
              Nessun giocatore ha risposto.
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {judgeData.answers.map((a) => (
                <div
                  key={a.playerId}
                  className={`card flex items-center justify-between gap-4 transition-all ${
                    judgments[a.playerId]
                      ? "border-success bg-success/5"
                      : "border-danger bg-danger/5"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{a.nickname}</p>
                    <p className="text-muted text-sm truncate">
                      &ldquo;{a.answerText}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        setJudgments((j) => ({ ...j, [a.playerId]: true }))
                      }
                      className={`w-12 h-12 rounded-xl border-2 text-xl transition-all ${
                        judgments[a.playerId]
                          ? "border-success bg-success/20 text-success"
                          : "border-border text-muted hover:border-success hover:text-success"
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() =>
                        setJudgments((j) => ({ ...j, [a.playerId]: false }))
                      }
                      className={`w-12 h-12 rounded-xl border-2 text-xl transition-all ${
                        !judgments[a.playerId]
                          ? "border-danger bg-danger/20 text-danger"
                          : "border-border text-muted hover:border-danger hover:text-danger"
                      }`}
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={submitJudgments} className="btn-primary w-full">
            Conferma e rivela
          </button>
        </div>
      </main>
    );
  }

  // Modalità presentatore: schermata unica con domanda + soluzione + giudizi per ogni giocatore
  if (phase === "QUESTION" && question && localPartyMode) {
    const correctAnswerId = question.answers.find((a) => {
      // Non abbiamo isCorrect nel QuestionData lato client, quindi identifichiamo
      // l'ID corretto cercando il testo nella soluzione ricevuta da game:local-host-info.
      return a.text.trim().toLowerCase() === localCorrectAnswer.trim().toLowerCase();
    })?.id;
    const activePlayers = players.filter((p) => !p.eliminated);
    // Modalità "A turno": in presentatore turnPlayerId è valorizzato solo se il gioco
    // è a turni. In tal caso risponde una sola persona per domanda → mostra solo la
    // sua riga di giudizio (non quella di tutti, che era fonte di confusione).
    const turnBasedLocal = !!turnPlayerId;
    const judgingPlayers = turnBasedLocal && activePlayerId
      ? activePlayers.filter((p) => p.id === activePlayerId)
      : activePlayers;
    const judgedCount = judgingPlayers.filter((p) => localJudgments[p.id] !== null && localJudgments[p.id] !== undefined).length;
    // Ciclo prev/next tra giocatori attivi per il turno
    const activeIdx = activePlayerId ? activePlayers.findIndex((p) => p.id === activePlayerId) : -1;
    const activePlayer = activeIdx >= 0 ? activePlayers[activeIdx] : null;
    const prevTurn = activePlayers.length > 0
      ? activePlayers[(activeIdx <= 0 ? activePlayers.length - 1 : activeIdx - 1)]
      : null;
    const nextTurn = activePlayers.length > 0
      ? activePlayers[(activeIdx < 0 || activeIdx === activePlayers.length - 1 ? 0 : activeIdx + 1)]
      : null;

    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted">
              Domanda {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="chip-gold">📣 Modalità presentatore</span>
          </div>

          {/* Banner "Tocca a" con prev/next/reset */}
          {activePlayers.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-gold/10 ring-1 ring-gold/40 flex items-center gap-3">
              <span className="text-sm text-muted flex-shrink-0">🎯 Tocca a</span>
              {activePlayer ? (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{activePlayer.emoji || "🎮"}</span>
                  <span className="text-xl font-bold truncate">{activePlayer.nickname}</span>
                </div>
              ) : (
                <span className="flex-1 text-muted italic">nessuno</span>
              )}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => prevTurn && setLocalTurn(prevTurn.id)}
                  disabled={!prevTurn}
                  className="px-2 py-1 rounded border border-border text-sm hover:bg-surface disabled:opacity-40"
                  title="Precedente"
                >◀</button>
                <button
                  onClick={() => nextTurn && setLocalTurn(nextTurn.id)}
                  disabled={!nextTurn}
                  className="px-2 py-1 rounded border border-border text-sm hover:bg-surface disabled:opacity-40"
                  title="Prossimo"
                >▶</button>
                <button
                  onClick={() => setLocalTurn(null)}
                  className="px-2 py-1 rounded border border-border text-xs text-muted hover:text-white"
                  title="Nessuno"
                >✕</button>
              </div>
            </div>
          )}

          {question.category && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 mb-4 text-sm"
              style={{
                backgroundColor: `${question.category.color}20`,
                color: question.category.color || "#fff",
              }}
            >
              {question.category.icon} {question.category.name}
            </div>
          )}

          {question.imageUrl && (
            <div className="mb-6 flex justify-center">
              <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} className="max-h-64 w-full" />
            </div>
          )}

          <h2 className="text-2xl md:text-4xl font-bold mb-6 leading-tight">
            {question.text}
          </h2>

          {/* Template parola per WORD_COMPLETION */}
          {question.questionType === "WORD_COMPLETION" && question.wordTemplate && (
            <div className="text-center mb-6">
              <div className="text-4xl font-mono font-bold tracking-widest text-muted">
                {question.wordTemplate.split("").map((ch, i) => (
                  <span key={i}>{ch === "_" ? "＿" : ch}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reazione a catena: 3 indizi */}
          {question.questionType === "REACTION_CHAIN" && (
            <div className="mb-6 space-y-2">
              {question.answers.map((clue, i) => (
                <div key={clue.id} className="p-3 rounded-xl border-2 border-accent/40 bg-accent/5">
                  <span className="text-xs font-bold text-accent mr-2">Indizio {i + 1}</span>
                  <span className="text-lg">{clue.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Only Connect */}
          {question.questionType === "ONLY_CONNECT" && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {question.answers.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border-2 border-accent/40 bg-accent/5 text-center text-xl font-bold">
                  {item.text}
                </div>
              ))}
            </div>
          )}

          {/* Risposte multiple choice: evidenzia la corretta */}
          {question.questionType === "MULTIPLE_CHOICE" && (
            <div className="grid md:grid-cols-2 gap-3 mb-6">
              {question.answers.map((a, i) => (
                <div
                  key={a.id}
                  className={`answer-tile ${
                    a.id === correctAnswerId
                      ? "border-success bg-success/20 text-success"
                      : "border-border bg-surface opacity-70"
                  }`}
                  style={{ cursor: "default" }}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {a.text}
                  {a.id === correctAnswerId && <span className="ml-2">✓</span>}
                </div>
              ))}
            </div>
          )}

          {/* Soluzione visibile solo all'host */}
          <div className="card mb-6 border-gold bg-gold/5 text-center">
            <p className="text-xs text-muted uppercase tracking-[0.2em] mb-1">🔒 Risposta corretta</p>
            <p className="text-2xl md:text-3xl font-bold text-gold">{localCorrectAnswer || "—"}</p>
          </div>

          {/* Giudizi per giocatore */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Giudica le risposte</h3>
              <span className="text-xs text-muted">
                {judgedCount} / {judgingPlayers.length} giudicati
              </span>
            </div>
            {activePlayers.length === 0 ? (
              <p className="text-muted text-center py-4 text-sm">Nessun giocatore in partita.</p>
            ) : (
              <div className="space-y-2">
                {judgingPlayers.map((p) => {
                  const j = localJudgments[p.id];
                  const judged = j !== null && j !== undefined;
                  const isActive = activePlayerId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        isActive ? "ring-2 ring-gold shadow-lg " : ""
                      }${
                        j === true ? "border-success bg-success/5" :
                        j === false ? "border-danger bg-danger/5" :
                        isActive ? "border-gold bg-gold/5" :
                        "border-border bg-background"
                      }`}
                    >
                      <button
                        onClick={() => setLocalTurn(isActive ? null : p.id)}
                        className={`w-8 h-8 rounded-lg text-sm transition-all flex-shrink-0 ${
                          isActive ? "bg-gold text-background" : "border border-border text-muted hover:text-gold hover:border-gold"
                        }`}
                        title={isActive ? "Togli dal turno" : "Imposta come giocatore di turno"}
                      >🎯</button>
                      <span className="text-2xl">{p.emoji || "🎮"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{p.nickname}{isActive && <span className="ml-2 text-xs text-gold">· tocca a te</span>}</p>
                        <p className="text-xs text-muted">
                          {p.score} punti
                          {judged && <span className="ml-2">{j ? "· ✓ corretta" : "· ✗ sbagliata"}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => localJudge(p.id, true)}
                          className={`w-12 h-12 rounded-xl border-2 text-xl transition-all ${
                            j === true
                              ? "border-success bg-success/20 text-success"
                              : "border-border text-muted hover:border-success hover:text-success"
                          }`}
                          aria-label={`${p.nickname} corretta`}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => localJudge(p.id, false)}
                          className={`w-12 h-12 rounded-xl border-2 text-xl transition-all ${
                            j === false
                              ? "border-danger bg-danger/20 text-danger"
                              : "border-border text-muted hover:border-danger hover:text-danger"
                          }`}
                          aria-label={`${p.nickname} sbagliata`}
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={endQuestion} className="btn-primary w-full text-lg py-4">
            Rivela risposta →
          </button>
          <button onClick={finishGameEarly} className="text-sm text-muted hover:text-danger w-full text-center py-2 mt-2">
            ✋ Termina partita ora
          </button>
        </div>
      </main>
    );
  }

  if (phase === "QUESTION" && question) {
    const isOpenType =
      question.questionType === "OPEN_ANSWER" ||
      question.questionType === "IMAGE_GUESS";

    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Banner speedrun globale */}
          {speedrunRemaining !== null && (
            <div className="mb-4 p-3 rounded-xl bg-accent/10 ring-1 ring-accent/40 text-center">
              <span className="text-sm text-muted mr-2">⚡ Speedrun</span>
              <span className="text-3xl font-bold tabular-nums text-accent">{speedrunRemaining}s</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <span className="text-muted">
              Domanda {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-muted">
              Risposte: {answeredCount} / {players.filter((p) => !p.eliminated).length}
              {players.some((p) => p.eliminated) && (
                <span className="ml-2 text-danger">· {players.filter((p) => p.eliminated).length} 💀</span>
              )}
            </span>
          </div>

          {/* Modalità a turni: evidenzia di chi è il turno */}
          {turnPlayerId && (
            <div className="mb-6 p-4 rounded-xl bg-gold/10 ring-2 ring-gold/50 text-center">
              <span className="text-sm text-muted mr-2">🎯 Tocca a</span>
              <span className="text-2xl font-bold text-gold">
                {turnPlayerNickname ?? "—"}
              </span>
              <p className="text-xs text-muted mt-1">
                Solo questo giocatore può rispondere. Gli altri guardano e aspettano.
              </p>
            </div>
          )}

          {question.timeLimit > 0 && (
            <div className="relative h-2 bg-surface rounded-full overflow-hidden mb-8">
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-all duration-1000"
                style={{ width: `${(remaining / question.timeLimit) * 100}%` }}
              />
            </div>
          )}

          {question.category && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 mb-4 text-sm"
              style={{
                backgroundColor: `${question.category.color}20`,
                color: question.category.color || "#fff",
              }}
            >
              {question.category.icon} {question.category.name}
            </div>
          )}

          {/* Media allegato */}
          {question.imageUrl && (
            <div className="mb-6 flex justify-center">
              <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} className="max-h-72 w-full" />
            </div>
          )}

          <h2 className="text-3xl md:text-5xl font-bold mb-12 leading-tight">
            {question.text}
          </h2>

          <div className="text-center mb-12">
            <div className="text-7xl font-bold text-accent tabular-nums">
              {question.timeLimit > 0 ? remaining : "♾️"}
            </div>
            <p className="text-muted mt-2">
              {isOpenType
                ? "I giocatori stanno scrivendo la loro risposta..."
                : question.questionType === "WORD_COMPLETION"
                  ? "I giocatori stanno completando la parola..."
                  : "I giocatori stanno rispondendo dal loro dispositivo..."}
            </p>
            {/* Pulsante Termina — sempre disponibile, indispensabile in modalità senza limite */}
            <button onClick={endQuestion}
              className="mt-6 px-6 py-3 rounded-xl border-2 border-danger/50 text-danger hover:bg-danger/10 font-medium text-sm">
              {question.timeLimit > 0 ? "⏭ Termina anticipatamente" : "✋ Termina domanda e mostra risposta"}
            </button>
          </div>

          {/* Template parola per WORD_COMPLETION */}
          {question.questionType === "WORD_COMPLETION" && question.wordTemplate && (
            <div className="text-center mb-8">
              <div className="text-5xl font-mono font-bold tracking-widest text-accent">
                {question.wordTemplate.split("").map((ch, i) => (
                  <span key={i} className={ch === "_" ? "text-muted" : ""}>
                    {ch === "_" ? "＿" : ch}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reazione a catena: mostra i 3 indizi (host vede tutti subito) */}
          {question.questionType === "REACTION_CHAIN" && (
            <div className="mb-8 space-y-3">
              {question.answers.map((clue, i) => (
                <div key={clue.id} className="p-4 rounded-xl border-2 border-accent/40 bg-accent/5">
                  <span className="text-xs font-bold text-accent mr-2">Indizio {i + 1}</span>
                  <span className="text-xl">{clue.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Only Connect: mostra i 4 elementi in griglia 2x2 */}
          {question.questionType === "ONLY_CONNECT" && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {question.answers.map((item) => (
                <div key={item.id} className="p-6 rounded-xl border-2 border-accent/40 bg-accent/5 text-center text-2xl font-bold">
                  {item.text}
                </div>
              ))}
            </div>
          )}

          {/* Risposte multiple choice (solo lettere sull'host) */}
          {question.questionType === "MULTIPLE_CHOICE" && (
            <div className="grid md:grid-cols-2 gap-4">
              {question.answers.map((a, i) => (
                <div
                  key={a.id}
                  className="answer-tile border-border bg-surface"
                  style={{ cursor: "default" }}
                >
                  <span className="text-accent font-bold mr-2">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {a.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // Schermata DEDICATA "Round finito": il reveal segnala un cambio round (torneo).
  // nextRound è valorizzato solo per round NON finali, quindi non serve controllare
  // questionNumber. Non dipende da `question` (null al refresh durante un reveal) così
  // l'host non resta bloccato sulla lobby a fine round.
  if (phase === "REVEAL" && reveal && reveal.nextRound) {
    const finishedRound = reveal.nextRound.roundNumber - 1;
    return (
      <main className="min-h-screen p-4 md:p-8 flex items-center">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-8 animate-slide-up">
            <div className="chip-gold inline-flex mb-3">🏁 Round completato</div>
            <h1 className="text-4xl md:text-5xl font-semibold mb-2">
              Round {finishedRound} completato
            </h1>
            <p className="text-muted">
              Round {reveal.nextRound.roundNumber} / {reveal.nextRound.totalRounds} ·
              prossima modalità: <span className="font-bold text-accent">{reveal.nextRound.modeLabel}</span>
            </p>
          </div>

          <div className="card mb-8">
            <h3 className="font-bold mb-4 text-center">Classifica</h3>
            <div className="space-y-2">
              {players.slice(0, 10).map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between py-1 ${p.eliminated ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-sm w-6">#{i + 1}</span>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <span className="text-xl">{p.emoji || "🎮"}</span>
                    )}
                    <span className={p.eliminated ? "line-through text-muted" : ""}>{p.nickname}</span>
                    {p.eliminated && <span className="text-xs px-2 py-0.5 rounded-full bg-danger/20 text-danger">💀 ELIMINATO</span>}
                    {livesAllowed && !p.eliminated && typeof p.wrongCount === "number" && (
                      <span className="text-xs">{"❤️".repeat(Math.max(0, livesAllowed - p.wrongCount))}{"🖤".repeat(p.wrongCount)}</span>
                    )}
                  </div>
                  <span className="font-bold text-accent">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={nextQuestion} className="btn-primary w-full">
            Inizia round {reveal.nextRound.roundNumber}: {reveal.nextRound.modeLabel}
          </button>
        </div>
      </main>
    );
  }

  if (phase === "REVEAL" && reveal && question) {
    const isMultipleChoice = reveal.questionType === "MULTIPLE_CHOICE";

    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Banner nuovo round (torneo) */}
          {reveal.nextRound && (
            <div className="mb-6 p-4 rounded-2xl bg-accent/10 ring-1 ring-accent/40 animate-slide-up">
              <p className="text-sm text-muted">
                Round {reveal.nextRound.roundNumber} / {reveal.nextRound.totalRounds} in arrivo
              </p>
              <p className="text-2xl font-bold">
                🏆 Prossima modalità: {reveal.nextRound.modeLabel}
              </p>
            </div>
          )}

          <h2 className="text-2xl md:text-3xl font-semibold text-muted mb-2">
            {question.text}
          </h2>
          <p className="text-success text-xl font-bold mb-8">
            ✓ Risposta corretta: {reveal.correctAnswerText || "—"}
          </p>

          {isMultipleChoice && (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {question.answers.map((a, i) => (
                <div
                  key={a.id}
                  className={`answer-tile ${
                    a.id === reveal.correctAnswerId
                      ? "border-success bg-success/20"
                      : "border-border bg-surface opacity-60"
                  }`}
                  style={{ cursor: "default" }}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {a.text}
                </div>
              ))}
            </div>
          )}

          {/* Risultati risposte aperte */}
          {!isMultipleChoice && reveal.playerResults.length > 0 && (
            <div className="card mb-8">
              <h3 className="font-bold mb-3">Risposte dei giocatori</h3>
              <div className="space-y-2">
                {reveal.playerResults.map((r) => (
                  <div
                    key={r.playerId}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className={r.wasCorrect ? "text-success" : "text-danger"}>
                        {r.wasCorrect ? "✓" : "✗"}
                      </span>
                      <span className="font-medium">{r.nickname}</span>
                      {r.answerText && (
                        <span className="text-muted text-sm">
                          &ldquo;{r.answerText}&rdquo;
                        </span>
                      )}
                    </div>
                    {r.wasCorrect && (
                      <span className="text-success text-sm font-bold">
                        +{r.pointsEarned}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card mb-6">
            <h3 className="font-bold mb-4">Classifica</h3>
            <div className="space-y-2">
              {players.slice(0, 10).map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between py-1 ${p.eliminated ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-sm w-6">#{i + 1}</span>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <span className="text-xl">{p.emoji || "🎮"}</span>
                    )}
                    <span className={p.eliminated ? "line-through text-muted" : ""}>{p.nickname}</span>
                    {p.eliminated && <span className="text-xs px-2 py-0.5 rounded-full bg-danger/20 text-danger">💀 ELIMINATO</span>}
                    {livesAllowed && !p.eliminated && typeof p.wrongCount === "number" && (
                      <span className="text-xs">{"❤️".repeat(Math.max(0, livesAllowed - p.wrongCount))}{"🖤".repeat(p.wrongCount)}</span>
                    )}
                  </div>
                  <span className="font-bold text-accent">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={nextQuestion} className="btn-primary w-full">
            {question.questionNumber >= question.totalQuestions
              ? "Vedi risultati finali"
              : reveal.nextRound
                ? `Inizia round ${reveal.nextRound.roundNumber}: ${reveal.nextRound.modeLabel}`
                : "Prossima domanda"}
          </button>
        </div>
      </main>
    );
  }

  // LOBBY
  const emojiChoices = ["🎮","🦁","🐯","🐵","🐼","🦊","🐶","🐱","🐸","🦉","🐙","🐢","🦄","🐞"];
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {!localPartyMode ? (
          <div className="text-center mb-8">
            <p className="text-muted mb-2">I giocatori devono andare su</p>
            <p className="text-xl font-mono mb-6">
              {typeof window !== "undefined" ? window.location.host : ""}/player
            </p>

            <div className="inline-block card px-12 py-8 ring-1 ring-accent/40">
              <p className="text-muted text-sm mb-2 uppercase tracking-[0.2em]">Codice partita</p>
              <p className="text-6xl md:text-7xl font-semibold tracking-[0.15em] font-mono">
                {code || "..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center mb-8">
            <div className="chip-gold inline-flex mb-3">📣 Modalità presentatore</div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">Aggiungi i partecipanti</h1>
            <p className="text-muted text-sm mb-6">
              Non serve che usino dispositivi: leggerai le domande a voce e giudicherai le risposte.
            </p>

            {/* Codice per spettatori: altro schermo / TV può seguire la partita senza spoiler */}
            <div className="inline-block card px-10 py-6 ring-1 ring-accent/40">
              <p className="text-muted text-xs mb-2 uppercase tracking-[0.2em]">👁 Codice spettatore</p>
              <p className="text-5xl md:text-6xl font-semibold tracking-[0.15em] font-mono mb-2">
                {code || "..."}
              </p>
              <p className="text-muted text-xs">
                Da un altro schermo apri <span className="font-mono">/spectator</span> per seguire la sfida in diretta
              </p>
            </div>
          </div>
        )}

        {/* Form aggiungi giocatore (solo modalità presentatore) */}
        {localPartyMode && (
          <div className="card mb-6">
            <h3 className="font-bold mb-3">Nuovo giocatore</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={addPlayerName}
                onChange={(e) => setAddPlayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addLocalPlayer(); }}
                placeholder="Nickname"
                className="input flex-1"
                maxLength={20}
              />
              <button
                onClick={addLocalPlayer}
                disabled={addingPlayer || !addPlayerName.trim()}
                className="btn-primary px-6"
              >
                {addingPlayer ? "..." : "Aggiungi"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {emojiChoices.map((e) => (
                <button
                  key={e}
                  onClick={() => setAddPlayerEmoji(e)}
                  className={`w-10 h-10 rounded-lg border-2 text-xl transition-all ${
                    addPlayerEmoji === e ? "border-accent bg-accent/10" : "border-border hover:border-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            {addPlayerError && (
              <p className="text-danger text-sm mt-2">{addPlayerError}</p>
            )}
          </div>
        )}

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Giocatori ({players.length})</h2>
          </div>
          {players.length === 0 ? (
            <p className="text-muted text-center py-8">
              {localPartyMode ? "Aggiungi almeno un giocatore per iniziare." : "In attesa dei giocatori..."}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-background rounded-lg p-3 text-center animate-fade-in flex flex-col items-center gap-1 relative"
                >
                  {localPartyMode && (
                    <button
                      onClick={() => removeLocalPlayer(p.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-danger/10 text-danger text-xs hover:bg-danger/20"
                      aria-label={`Rimuovi ${p.nickname}`}
                    >
                      ✕
                    </button>
                  )}
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <span className="text-3xl">{p.emoji || "🎮"}</span>
                  )}
                  <span className="text-sm font-medium truncate w-full">{p.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={startGame}
          disabled={players.length === 0}
          className="btn-primary w-full text-lg py-4"
        >
          {players.length === 0
            ? "Attendi almeno un giocatore"
            : `Avvia partita con ${players.length} giocatore${players.length > 1 ? "i" : ""}`}
        </button>

        {players.length >= 2 && (
          <button
            onClick={() => { setDuelPickA(players[0]?.id ?? ""); setDuelPickB(players[1]?.id ?? ""); setShowDuelPicker(true); }}
            className="btn-secondary w-full text-base py-3 mt-3"
          >
            ⏱ Avvia duello 100 Secondi
          </button>
        )}

        {showDuelPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="card w-full max-w-md animate-slide-up">
              <h3 className="text-xl font-bold mb-1">⏱ 100 Secondi</h3>
              <p className="text-muted text-sm mb-4">Scegli i due sfidanti e la durata</p>
              <label className="block text-sm mb-1">Sfidante A</label>
              <select value={duelPickA} onChange={(e) => setDuelPickA(e.target.value)} className="input w-full mb-3">
                {players.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </select>
              <label className="block text-sm mb-1">Sfidante B</label>
              <select value={duelPickB} onChange={(e) => setDuelPickB(e.target.value)} className="input w-full mb-3">
                {players.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </select>
              <label className="block text-sm mb-1">Durata (secondi per ciascuno)</label>
              <input type="number" min={10} max={600} value={duelDuration} onChange={(e) => setDuelDuration(Number(e.target.value) || 100)} className="input w-full mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setShowDuelPicker(false)} className="btn-secondary flex-1">Annulla</button>
                <button onClick={startDuel} disabled={!duelPickA || !duelPickB || duelPickA === duelPickB} className="btn-primary flex-1">Avvia</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
