"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/lib/useSocket";
import type {
  PlayerInfo,
  QuestionData,
  RevealData,
  LocalRoundState,
  CategoryGridData,
} from "@/types/socket";
import MediaDisplay from "@/components/MediaDisplay";

type Phase = "LOBBY" | "QUESTION" | "REVEAL" | "FINISHED" | "CATEGORY_PICK";

export default function SpectatorViewerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<Set<string>>(new Set());
  const [finalRanking, setFinalRanking] = useState<PlayerInfo[]>([]);
  const [speedrunRemaining, setSpeedrunRemaining] = useState<number | null>(null);
  const [livesAllowed, setLivesAllowed] = useState<number | null>(null);
  const [localPartyMode, setLocalPartyMode] = useState(false);
  const [localJudgments, setLocalJudgments] = useState<Record<string, boolean | null>>({});
  const [categoryGrid, setCategoryGrid] = useState<CategoryGridData | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("spectatorCode");
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    if (!socket || !gameId) return;

    const savedCode = localStorage.getItem("spectatorCode") || "";
    if (!savedCode) { router.push("/spectator"); return; }

    socket.emit("spectator:join", { code: savedCode }, (res) => {
      if (!res.success) {
        localStorage.removeItem("spectatorGameId");
        localStorage.removeItem("spectatorCode");
        alert(res.error || "Impossibile seguire questa partita");
        router.push("/spectator");
        return;
      }
      const s = res.state;
      if (s.code) setCode(s.code);
      setPlayers(s.players);
      if (typeof s.speedrunRemaining === "number") setSpeedrunRemaining(s.speedrunRemaining);
      if (s.livesAllowed) setLivesAllowed(s.livesAllowed);
      if (s.localPartyMode) setLocalPartyMode(true);
      if (s.localState) setLocalJudgments(s.localState.judgments);
      if (s.localState) setActivePlayerId(s.localState.activePlayerId ?? null);
      if (s.categoryGrid) { setCategoryGrid(s.categoryGrid); setPhase("CATEGORY_PICK"); return; }

      if (s.gameStatus === "FINISHED") {
        setFinalRanking(s.finalRanking ?? s.players);
        setPhase("FINISHED");
        return;
      }
      if (s.gameStatus === "LOBBY") { setPhase("LOBBY"); return; }
      // PLAYING
      if (s.isRevealing && s.reveal) {
        setReveal(s.reveal);
        setPhase("REVEAL");
      } else if (s.currentQuestion) {
        setQuestion(s.currentQuestion);
        setRemaining(s.remainingTime ?? s.currentQuestion.timeLimit);
        setReveal(null);
        setPhase("QUESTION");
      } else {
        setPhase("LOBBY");
      }
    });

    socket.on("lobby:updated", ({ players }) => setPlayers(players));
    socket.on("lobby:started", () => setPhase("QUESTION"));

    socket.on("game:question", (q) => {
      setQuestion(q);
      setReveal(null);
      setAnsweredPlayerIds(new Set());
      setRemaining(q.timeLimit);
      setLocalJudgments({});
      setPhase("QUESTION");
      setCategoryGrid(null);
    });

    socket.on("game:timer", ({ remaining }) => setRemaining(remaining));
    socket.on("game:answer-received", ({ playerId }) => {
      setAnsweredPlayerIds((prev) => {
        const next = new Set(prev);
        next.add(playerId);
        return next;
      });
    });
    socket.on("game:reveal", (data) => { setReveal(data); setPhase("REVEAL"); });
    socket.on("game:leaderboard", ({ players }) => setPlayers(players));
    socket.on("game:finished", ({ players }) => { setFinalRanking(players); setPhase("FINISHED"); });
    socket.on("game:speedrun-timer", ({ remaining }) => setSpeedrunRemaining(remaining));
    socket.on("game:local-state", (s: LocalRoundState) => {
      setLocalJudgments(s.judgments);
      setActivePlayerId(s.activePlayerId ?? null);
    });
    socket.on("game:category-grid", (data) => { setCategoryGrid(data); setPhase("CATEGORY_PICK"); });

    return () => {
      socket.off("lobby:updated");
      socket.off("lobby:started");
      socket.off("game:question");
      socket.off("game:timer");
      socket.off("game:answer-received");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("game:finished");
      socket.off("game:speedrun-timer");
      socket.off("game:local-state");
      socket.off("game:category-grid");
    };
  }, [socket, gameId, router]);

  const exit = () => {
    localStorage.removeItem("spectatorGameId");
    localStorage.removeItem("spectatorCode");
    router.push("/");
  };

  // ========== RENDER ==========

  if (phase === "FINISHED") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold">Partita terminata</h1>
          </div>
          <div className="card space-y-3">
            {finalRanking.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  i === 0 ? "bg-warning/20 border border-warning"
                    : i === 1 ? "bg-border"
                    : i === 2 ? "bg-border/50"
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
          <button onClick={exit} className="btn-secondary w-full mt-6">Torna alla home</button>
        </div>
      </main>
    );
  }

  const leaderboard = (
    <div className="card">
      <h3 className="font-bold mb-3">Classifica</h3>
      {players.length === 0 ? (
        <p className="text-muted text-sm text-center py-3">Nessun giocatore.</p>
      ) : (
        <div className="space-y-1.5">
          {players.slice(0, 10).map((p, i) => {
            const j = localJudgments[p.id];
            return (
              <div key={p.id} className={`flex items-center justify-between py-1 ${p.eliminated ? "opacity-50" : ""} ${activePlayerId === p.id ? "bg-gold/10 rounded-lg px-2 -mx-2 ring-1 ring-gold/50" : ""}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted text-xs w-5">#{i + 1}</span>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg">{p.emoji || "🎮"}</span>
                  )}
                  <span className={`truncate ${p.eliminated ? "line-through text-muted" : ""}`}>{p.nickname}</span>
                  {activePlayerId === p.id && <span className="text-xs" title="tocca a te">🎯</span>}
                  {p.eliminated && <span className="text-xs">💀</span>}
                  {livesAllowed && !p.eliminated && typeof p.wrongCount === "number" && (
                    <span className="text-xs">{"❤️".repeat(Math.max(0, livesAllowed - p.wrongCount))}</span>
                  )}
                  {/* Indicatore risposta: normale = check se ha risposto; local = ✓/✗ */}
                  {localPartyMode ? (
                    j === true ? <span className="text-success text-sm">✓</span> :
                    j === false ? <span className="text-danger text-sm">✗</span> : null
                  ) : (
                    phase === "QUESTION" && answeredPlayerIds.has(p.id) && <span className="text-accent text-xs">✓</span>
                  )}
                </div>
                <span className="font-bold text-accent text-sm">{p.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (phase === "REVEAL" && reveal && question) {
    const isMultipleChoice = reveal.questionType === "MULTIPLE_CHOICE";
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_280px] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">
                Domanda {question.questionNumber} / {question.totalQuestions}
              </span>
              <span className="chip-gold">👁 Spettatore</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-muted mb-2">{question.text}</h2>
            <p className="text-success text-xl md:text-2xl font-bold mb-6">
              ✓ Risposta corretta: {reveal.correctAnswerText || "—"}
            </p>

            {isMultipleChoice && (
              <div className="grid md:grid-cols-2 gap-3 mb-6">
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

            {!isMultipleChoice && reveal.playerResults.length > 0 && (
              <div className="card mb-6">
                <h3 className="font-bold mb-3">Risposte</h3>
                <div className="space-y-2">
                  {reveal.playerResults.map((r) => (
                    <div key={r.playerId} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className={r.wasCorrect ? "text-success" : "text-danger"}>
                          {r.wasCorrect ? "✓" : "✗"}
                        </span>
                        <span className="font-medium">{r.nickname}</span>
                        {r.answerText && (
                          <span className="text-muted text-sm">&ldquo;{r.answerText}&rdquo;</span>
                        )}
                      </div>
                      {r.wasCorrect && (
                        <span className="text-success text-sm font-bold">+{r.pointsEarned}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {leaderboard}
        </div>
      </main>
    );
  }

  if (phase === "CATEGORY_PICK" && categoryGrid) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_280px] gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Selezione categoria</span>
              <span className="chip-gold">🎯 Spettatore</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Il presentatore sta scegliendo la categoria
            </h2>

            {categoryGrid.roundInfo && (
              <div className="mb-6 text-muted">
                <p className="text-sm">
                  Round {categoryGrid.roundInfo.roundNumber}/{categoryGrid.roundInfo.totalRounds} · {categoryGrid.roundInfo.modeLabel}
                </p>
                <p className="text-sm">
                  Domanda {categoryGrid.roundInfo.questionIndexInRound}/{categoryGrid.roundInfo.questionsPerRound} del round
                </p>
              </div>
            )}

            {activePlayerId && (() => {
              const p = players.find((x) => x.id === activePlayerId);
              return p ? (
                <div className="mb-4 p-3 rounded-xl bg-gold/10 ring-1 ring-gold/40 text-center">
                  <span className="text-sm text-muted mr-2">🎯 Sceglie</span>
                  <span className="text-2xl font-bold">{p.emoji || "🎮"} {p.nickname}</span>
                </div>
              ) : null;
            })()}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categoryGrid.categories.map((c) => {
                const exhausted = c.remaining === 0;
                const accent = c.color || "#6366f1";
                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border-2 text-center ${exhausted ? "opacity-30" : ""}`}
                    style={{
                      backgroundColor: `${accent}20`,
                      borderColor: accent,
                      cursor: "default",
                    }}
                  >
                    {c.icon && <div className="text-3xl mb-1">{c.icon}</div>}
                    <div className="font-bold text-lg truncate">{c.name}</div>
                    <div className="text-xs text-muted mt-1">
                      {exhausted ? "esaurita" : `${c.remaining} rimanenti`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {leaderboard}
        </div>
      </main>
    );
  }

  if (phase === "QUESTION" && question) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_280px] gap-6">
          <div>
            {/* Banner speedrun */}
            {speedrunRemaining !== null && (
              <div className="mb-4 p-3 rounded-xl bg-accent/10 ring-1 ring-accent/40 text-center">
                <span className="text-sm text-muted mr-2">⚡ Speedrun</span>
                <span className="text-3xl font-bold tabular-nums text-accent">{speedrunRemaining}s</span>
              </div>
            )}

            {/* Banner "Tocca a X" */}
            {activePlayerId && (() => {
              const p = players.find((x) => x.id === activePlayerId);
              return p ? (
                <div className="mb-4 p-3 rounded-xl bg-gold/10 ring-1 ring-gold/40 text-center">
                  <span className="text-sm text-muted mr-2">🎯 Risponde ora</span>
                  <span className="text-2xl font-bold">{p.emoji || "🎮"} {p.nickname}</span>
                </div>
              ) : null;
            })()}

            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">
                Domanda {question.questionNumber} / {question.totalQuestions}
              </span>
              <span className="chip-gold">👁 Spettatore</span>
            </div>

            {question.timeLimit > 0 && (
              <div className="relative h-2 bg-surface rounded-full overflow-hidden mb-6">
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

            {question.imageUrl && (
              <div className="mb-6 flex justify-center">
                <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} className="max-h-72 w-full" />
              </div>
            )}

            <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">{question.text}</h2>

            <div className="text-center mb-8">
              <div className="text-7xl font-bold text-accent tabular-nums">
                {question.timeLimit > 0 ? remaining : "—"}
              </div>
              <p className="text-muted mt-2 text-sm">
                {localPartyMode
                  ? "Il presentatore sta conducendo a voce"
                  : "I giocatori stanno rispondendo..."}
              </p>
            </div>

            {/* WORD_COMPLETION: template visibile */}
            {question.questionType === "WORD_COMPLETION" && question.wordTemplate && (
              <div className="text-center mb-6">
                <div className="text-5xl font-mono font-bold tracking-widest text-muted">
                  {question.wordTemplate.split("").map((ch, i) => (
                    <span key={i}>{ch === "_" ? "＿" : ch}</span>
                  ))}
                </div>
              </div>
            )}

            {/* REACTION_CHAIN: 3 indizi */}
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

            {/* ONLY_CONNECT: 4 elementi */}
            {question.questionType === "ONLY_CONNECT" && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {question.answers.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border-2 border-accent/40 bg-accent/5 text-center text-xl font-bold">
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            {/* MULTIPLE_CHOICE: opzioni SENZA evidenziare la corretta */}
            {question.questionType === "MULTIPLE_CHOICE" && (
              <div className="grid md:grid-cols-2 gap-3">
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

          {leaderboard}
        </div>
      </main>
    );
  }

  // LOBBY
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={exit} className="text-sm text-muted hover:text-white">‹ Esci</button>
          <div className="chip-gold">👁 Spettatore</div>
          {!isConnected && <span className="text-warning text-sm">Riconnessione...</span>}
        </div>

        <div className="text-center mb-8">
          <p className="text-muted text-sm mb-2">Stai seguendo la partita</p>
          <p className="text-4xl md:text-5xl font-mono font-semibold tracking-widest">{code || "..."}</p>
          <p className="text-muted text-sm mt-3">
            Attesa avvio partita. Quando il presentatore inizierà, vedrai la domanda qui.
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Giocatori ({players.length})</h2>
          {players.length === 0 ? (
            <p className="text-muted text-center py-6">Nessun giocatore ancora in lobby.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-background rounded-lg p-3 text-center flex flex-col items-center gap-1"
                >
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
      </div>
    </main>
  );
}
