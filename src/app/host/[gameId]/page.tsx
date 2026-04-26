"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/lib/useSocket";
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
  const { socket, isConnected } = useSocket();

  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
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

  useEffect(() => {
    const saved = localStorage.getItem("hostCode");
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    if (!socket || !gameId) return;

    socket.emit("host:join", { gameId }, (res) => {
      if (!res.success) {
        // Partita scaduta o inesistente: pulisci localStorage
        localStorage.removeItem("hostGameId");
        localStorage.removeItem("hostCode");
        alert(res.error || "Impossibile riconnettersi alla partita");
        router.push("/");
        return;
      }
      // Ripristina lo stato dallo snapshot
      const s = res.state;
      if (s.code) setCode(s.code);
      setPlayers(s.players);
      if (typeof s.speedrunRemaining === "number") setSpeedrunRemaining(s.speedrunRemaining);
      if (s.livesAllowed) setLivesAllowed(s.livesAllowed);
      if (s.jeopardyGrid) { setJeopardyGrid(s.jeopardyGrid); }
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
      // PLAYING
      if (s.categoryGrid) {
        setPhase("CATEGORY_PICK");
      } else if (s.jeopardyGrid) {
        setPhase("JEOPARDY_GRID");
      } else if (s.judging) {
        setJudgeData(s.judging);
        const initial: Record<string, boolean> = {};
        s.judging.answers.forEach((a) => { initial[a.playerId] = false; });
        setJudgments(initial);
        setPhase("JUDGING");
      } else if (s.isRevealing && s.reveal) {
        setReveal(s.reveal);
        setPhase("REVEAL");
      } else if (s.currentQuestion) {
        setQuestion(s.currentQuestion);
        setRemaining(s.remainingTime ?? s.currentQuestion.timeLimit);
        setReveal(null);
        setJudgeData(null);
        setPhase("QUESTION");
      }
    });

    socket.on("lobby:updated", ({ players }) => {
      setPlayers((prev) => {
        if (players.length > prev.length) playSound("join");
        return players;
      });
    });

    socket.on("lobby:started", () => {
      playSound("start");
      setPhase("QUESTION");
    });

    socket.on("game:question", (q) => {
      setQuestion(q);
      setReveal(null);
      setJudgeData(null);
      setJudgments({});
      setAnsweredCount(0);
      setRemaining(q.timeLimit);
      setLocalJudgments({});
      setLocalCorrectAnswer("");
      setCategoryGrid(null);
      setPhase("QUESTION");
    });

    socket.on("game:speedrun-timer", ({ remaining }) => setSpeedrunRemaining(remaining));
    socket.on("game:jeopardy-grid", (data) => {
      setJeopardyGrid(data);
      setPhase("JEOPARDY_GRID");
    });
    socket.on("game:category-grid", (data) => {
      setCategoryGrid(data);
      setPhase("CATEGORY_PICK");
    });

    socket.on("game:timer", ({ remaining }) => {
      setRemaining(remaining);
      if (remaining > 0 && remaining <= 5) playSound("tick");
    });

    socket.on("game:answer-received", () => {
      setAnsweredCount((c) => c + 1);
    });

    // Richiesta giudizio risposte aperte (OPEN_ANSWER / IMAGE_GUESS)
    socket.on("game:judge-answers", (data) => {
      setJudgeData(data);
      const initial: Record<string, boolean> = {};
      data.answers.forEach((a) => { initial[a.playerId] = false; });
      setJudgments(initial);
      setPhase("JUDGING");
    });

    socket.on("game:reveal", (data) => {
      setReveal(data);
      setPhase("REVEAL");
    });

    socket.on("game:leaderboard", ({ players }) => {
      setPlayers(players);
    });

    socket.on("game:finished", ({ players }) => {
      playSound("finish");
      setFinalRanking(players);
      setPhase("FINISHED");
    });

    socket.on("duel:state", (st) => setDuel(st));
    socket.on("duel:host-info", ({ correctAnswer }) => setDuelAnswer(correctAnswer));
    socket.on("duel:ended", ({ winnerNickname, loserNickname }) => {
      setDuelEnded({ winnerNickname, loserNickname });
      setTimeout(() => { setDuelEnded(null); setDuel(null); setDuelAnswer(""); }, 5000);
    });

    // Modalità presentatore
    socket.on("game:local-state", (s: LocalRoundState) => {
      setLocalJudgments(s.judgments);
      setActivePlayerId(s.activePlayerId ?? null);
    });
    socket.on("game:local-host-info", ({ correctAnswerText }) => setLocalCorrectAnswer(correctAnswerText));

    return () => {
      socket.off("lobby:updated");
      socket.off("lobby:started");
      socket.off("game:question");
      socket.off("game:timer");
      socket.off("game:answer-received");
      socket.off("game:judge-answers");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("game:finished");
      socket.off("game:speedrun-timer");
      socket.off("game:jeopardy-grid");
      socket.off("duel:state");
      socket.off("duel:host-info");
      socket.off("duel:ended");
      socket.off("game:local-state");
      socket.off("game:local-host-info");
      socket.off("game:category-grid");
    };
  }, [socket, gameId, router]);

  const startGame = () => socket?.emit("host:start", { gameId });
  const nextQuestion = () => socket?.emit("host:next", { gameId });
  const endQuestion = () => socket?.emit("host:endQuestion", { gameId });
  const pickCell = (gameQuestionId: string) => socket?.emit("host:jeopardy-pick", { gameId, gameQuestionId });
  const playAgain = () => router.push("/host");

  const addLocalPlayer = () => {
    if (!socket) return;
    const name = addPlayerName.trim();
    if (!name) { setAddPlayerError("Inserisci un nickname"); return; }
    setAddingPlayer(true);
    setAddPlayerError("");
    socket.emit("host:local-add-player", { gameId, nickname: name, emoji: addPlayerEmoji }, (res) => {
      setAddingPlayer(false);
      if ("error" in res) { setAddPlayerError(res.error); return; }
      setAddPlayerName("");
    });
  };
  const removeLocalPlayer = (playerId: string) => {
    if (!socket) return;
    socket.emit("host:local-remove-player", { gameId, playerId });
  };
  const localJudge = (playerId: string, isCorrect: boolean) => {
    if (!socket) return;
    socket.emit("host:local-judge", { gameId, playerId, isCorrect });
  };
  const setLocalTurn = (playerId: string | null) => {
    if (!socket) return;
    socket.emit("host:local-set-turn", { gameId, playerId });
  };
  const pickCategory = (categoryId: string) => {
    if (!socket) return;
    socket.emit("host:category-pick", { gameId, categoryId });
  };
  const finishGameEarly = () => {
    if (!socket) return;
    if (!window.confirm("Terminare la partita ora? La classifica finale verrà calcolata con i punti attuali.")) return;
    socket.emit("host:finish", { gameId });
  };

  const submitJudgments = () => {
    if (!socket || !judgeData) return;
    const list = Object.entries(judgments).map(([playerId, isCorrect]) => ({
      playerId,
      isCorrect,
    }));
    socket.emit("host:judge", { gameId, judgments: list });
  };

  const startDuel = () => {
    if (!socket || !duelPickA || !duelPickB || duelPickA === duelPickB) return;
    socket.emit("duel:start", { gameId, playerAId: duelPickA, playerBId: duelPickB, durationSec: duelDuration }, (res) => {
      if ("error" in res) alert(res.error);
      else setShowDuelPicker(false);
    });
  };
  const stopDuel = () => socket?.emit("duel:stop", { gameId });
  const toggleDuelPause = () => {
    if (!socket || !duel) return;
    socket.emit("duel:pause", { gameId, paused: !duel.paused });
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
                  onClick={() => socket?.emit("duel:judge", { gameId, isCorrect: true })}
                  className="btn-primary flex-1 text-lg py-4"
                >✓ Corretta</button>
                <button
                  onClick={() => socket?.emit("duel:judge", { gameId, isCorrect: false })}
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
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="chip-gold inline-flex mb-2">🎯 Scegli categoria</div>
            <h2 className="text-2xl md:text-3xl font-bold">Scegli la categoria della prossima domanda</h2>
            <p className="text-muted text-sm">
              {totalRemaining} domande rimaste · {availableCats.length} categorie disponibili
            </p>
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
              const disabled = c.remaining === 0;
              return (
                <button
                  key={c.id}
                  onClick={() => !disabled && pickCategory(c.id)}
                  disabled={disabled}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    disabled
                      ? "border-border/30 bg-surface/30 opacity-30 cursor-not-allowed"
                      : "border-gold bg-gold/10 hover:bg-gold/20 active:scale-95"
                  }`}
                  style={!disabled && c.color ? { borderColor: c.color, backgroundColor: `${c.color}15` } : undefined}
                >
                  <div className="text-3xl mb-1">{c.icon || "🏷️"}</div>
                  <div className="font-bold truncate">{c.name}</div>
                  <div className="text-xs text-muted mt-1">
                    {disabled ? "Esaurita" : `${c.remaining} rimaste`}
                  </div>
                </button>
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
            <button onClick={() => socket?.emit("host:next", { gameId })} className="btn-primary w-full mt-6">
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
    const judgedCount = activePlayers.filter((p) => localJudgments[p.id] !== null && localJudgments[p.id] !== undefined).length;
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
                {judgedCount} / {activePlayers.length} giudicati
              </span>
            </div>
            {activePlayers.length === 0 ? (
              <p className="text-muted text-center py-4 text-sm">Nessun giocatore in partita.</p>
            ) : (
              <div className="space-y-2">
                {activePlayers.map((p) => {
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
            {question.questionNumber >= question.totalQuestions ? "Mostra risultati finali" : "Prossima domanda →"}
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
            {!isConnected && (
              <span className="text-warning text-sm">Riconnessione...</span>
            )}
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
