"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePusherChannel } from "@/lib/pusher-client";
import { useGameTick } from "@/lib/use-game-tick";
import { playSound, preloadCategoryJingle } from "@/lib/sound";
import type {
  PlayerInfo,
  QuestionData,
  RevealData,
  LocalRoundState,
  CategoryGridData,
} from "@/types/socket";
import MediaDisplay from "@/components/MediaDisplay";
import TurnAnnounce, { type AnnouncePlayer } from "@/components/TurnAnnounce";
import TurnResult, { type ResultPlayer } from "@/components/TurnResult";
import CategoryRevealSplash from "@/components/CategoryRevealSplash";

// Splash cambio round sul grande schermo spettatori (sempre "over": la domanda è già
// arrivata, lo splash la copre per qualche secondo e poi la rivela).
type SpectatorSplash = { category: { name: string; color?: string | null; icon?: string | null }; roundNumber: number; totalRounds: number; modeLabel: string };

type Phase = "LOBBY" | "QUESTION" | "REVEAL" | "FINISHED" | "CATEGORY_PICK";

export default function SpectatorViewerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  // Migration vercel-pusher fase 7.6: usePusherChannel al posto di useSocket.
  const channel = usePusherChannel(gameId ? `game-${gameId}` : null);
  // Fase 8: polling del tick per timer accurati + auto-fine domanda.
  // Disabilita quando la partita è finita: niente da rinfrescare.
  const tick = useGameTick(gameId ?? null, { intervalMs: 2000 });

  const [code, setCode] = useState("");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [timeUp, setTimeUp] = useState(false); // "TEMPO SCADUTO" + sirena a 0
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [answeredPlayerIds, setAnsweredPlayerIds] = useState<Set<string>>(new Set());
  const [finalRanking, setFinalRanking] = useState<PlayerInfo[]>([]);
  const [speedrunRemaining, setSpeedrunRemaining] = useState<number | null>(null);
  const [livesAllowed, setLivesAllowed] = useState<number | null>(null);
  const [localPartyMode, setLocalPartyMode] = useState(false);
  const [localJudgments, setLocalJudgments] = useState<Record<string, boolean | null>>({});
  const [categoryGrid, setCategoryGrid] = useState<CategoryGridData | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  // Annuncio "Tocca a te" a tutto schermo prima della domanda.
  const [announce, setAnnounce] = useState<AnnouncePlayer | null>(null);
  const announcedQnRef = useRef<number | null>(null);
  // Congela il cronometro mentre l'animazione "Tocca a te" è in corso.
  const freezeTimerRef = useRef(false);
  // Esito del turno appena giudicato (splash ✓/✗ + punti).
  const [turnResult, setTurnResult] = useState<ResultPlayer | null>(null);
  // Giudizi della domanda precedente (per capire chi è stato appena giudicato).
  const prevJudgmentsRef = useRef<Record<string, boolean | null>>({});
  // Lista giocatori sempre aggiornata per i listener Pusher (bound una sola volta).
  const playersRef = useRef<PlayerInfo[]>([]);
  // Splash cambio round (categoria singola): nome categoria + jingle a tema.
  const [splash, setSplash] = useState<SpectatorSplash | null>(null);

  // Countdown locale 1s tra un tick e l'altro per animazione fluida; la verità
  // (vedi sotto) la sovrascrive dal server ogni 2s.
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (phase !== "QUESTION" || !question || question.timeLimit <= 0) return;
    tickRef.current = setInterval(() => {
      if (freezeTimerRef.current) return; // durante l'animazione "Tocca a te" il timer è fermo
      setRemaining((r) => {
        const next = r > 0 ? r - 1 : 0;
        if (next > 0 && next <= 5) playSound("tick"); // tic-tac ultimi 5s sul grande schermo
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, question]);

  // Sincronizza i timer dal server tick (fase 8): se c'è una domanda attiva
  // sovrascrive `remaining` con il valore autoritativo. Speedrun idem.
  useEffect(() => {
    if (!tick) return;
    // Durante l'animazione "Tocca a te" non sincronizzare: il timer resta pieno finché
    // l'animazione non finisce (la deadline server include già l'intro, vedi game-actions).
    if (tick.questionRemaining !== null && phase === "QUESTION" && !freezeTimerRef.current) {
      const cap = question && question.timeLimit > 0 ? question.timeLimit : tick.questionRemaining;
      setRemaining(Math.min(tick.questionRemaining, cap));
    }
    if (tick.speedrunRemaining !== speedrunRemaining) {
      setSpeedrunRemaining(tick.speedrunRemaining);
    }
  }, [tick, phase, speedrunRemaining, question]);

  // Sirena + "TEMPO SCADUTO" sul grande schermo quando il countdown arriva a 0.
  useEffect(() => {
    if (phase === "QUESTION" && question && question.timeLimit > 0 && remaining === 0) {
      if (!timeUp) {
        setTimeUp(true);
        playSound("timeup");
      }
    } else if (timeUp) {
      setTimeUp(false);
    }
  }, [remaining, phase, question, timeUp]);

  useEffect(() => {
    const saved = localStorage.getItem("spectatorCode");
    if (saved) setCode(saved);
  }, []);

  // Annuncio "Tocca a te": una volta per domanda, quando è noto il giocatore di turno
  // (presentatore: activePlayerId; a-turni / "chi sceglie=chi risponde": turnPlayerId).
  useEffect(() => {
    if (phase !== "QUESTION" || !question) return;
    const qn = question.questionNumber;
    if (announcedQnRef.current === qn) return;
    const turnId = activePlayerId ?? question.turnPlayerId ?? null;
    if (!turnId) return; // FREE_FOR_ALL o turno non ancora risolto → nessun annuncio
    const p = players.find((x) => x.id === turnId);
    announcedQnRef.current = qn;
    setAnnounce({
      nickname: p?.nickname ?? question.turnPlayerNickname ?? "",
      emoji: p?.emoji,
      avatarUrl: p?.avatarUrl,
    });
    playSound("start");
  }, [phase, question, activePlayerId, players]);

  // Il cronometro è fermo finché l'animazione "Tocca a te" è visibile.
  useEffect(() => {
    freezeTimerRef.current = announce !== null;
  }, [announce]);

  // Mantieni playersRef aggiornato per i listener Pusher.
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Rejoin: POST /api/spectator (fase 7.1) per recuperare lo snapshot iniziale.
  useEffect(() => {
    if (!gameId) return;
    const savedCode = localStorage.getItem("spectatorCode") || "";
    if (!savedCode) { router.push("/spectator"); return; }

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/spectator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: savedCode }),
        });
        const res = await r.json();
        if (cancelled) return;
        if (!r.ok || !res.success) {
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
        // Riallinea la baseline giudizi così il rejoin non fa comparire lo splash esito.
        if (s.localState) prevJudgmentsRef.current = s.localState.judgments;
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
          // Ricongiungendosi a domanda in corso non riproporre l'annuncio a tutto schermo.
          announcedQnRef.current = s.currentQuestion.questionNumber ?? null;
          setRemaining(s.remainingTime ?? s.currentQuestion.timeLimit);
          setReveal(null);
          setPhase("QUESTION");
        } else {
          setPhase("LOBBY");
        }
      } catch (e) {
        if (cancelled) return;
        alert(e instanceof Error ? e.message : "Errore di rete");
        router.push("/spectator");
      }
    })();

    return () => { cancelled = true; };
  }, [gameId, router]);

  // Listener Pusher sul canale game-{gameId}.
  useEffect(() => {
    if (!channel) return;

    const onLobbyUpdated = ({ players }: { players: PlayerInfo[] }) => setPlayers(players);
    const onLobbyStarted = () => setPhase("QUESTION");
    const onGameQuestion = (q: QuestionData) => {
      setQuestion(q);
      setReveal(null);
      setAnsweredPlayerIds(new Set());
      setRemaining(q.timeLimit);
      setLocalJudgments({});
      // Nuova domanda: azzera esito e baseline giudizi.
      setTurnResult(null);
      prevJudgmentsRef.current = {};
      // Azzera il turno "presentatore": lo ripopola game:local-state con il valore per
      // la NUOVA domanda, così l'annuncio non mostra quello della domanda precedente.
      setActivePlayerId(null);
      setPhase("QUESTION");
      setCategoryGrid(null);
      // Prima domanda di un round a categoria singola → splash animato + jingle sul
      // grande schermo (vale per tutti i round, round 1 incluso). Poi rivela la domanda.
      setSplash(q.roundIntro ? { ...q.roundIntro } : null);
    };
    const onAnswerReceived = ({ playerId }: { playerId: string }) => {
      setAnsweredPlayerIds((prev) => {
        const next = new Set(prev);
        next.add(playerId);
        return next;
      });
    };
    const onReveal = (data: RevealData) => {
      // Precarica l'eventuale MP3 della categoria in arrivo (pronto per lo splash).
      if (data.nextRound?.category) preloadCategoryJingle(data.nextRound.category.name);
      setReveal(data);
      setPhase("REVEAL");
    };
    const onLeaderboard = ({ players }: { players: PlayerInfo[] }) => setPlayers(players);
    const onFinished = ({ players }: { players: PlayerInfo[] }) => {
      setFinalRanking(players);
      setPhase("FINISHED");
    };
    const onSpeedrunTimer = ({ remaining }: { remaining: number }) => setSpeedrunRemaining(remaining);
    const onLocalState = (s: LocalRoundState) => {
      // Splash esito: trova il giocatore appena giudicato (da non-giudicato a ✓/✗).
      const prev = prevJudgmentsRef.current;
      let judgedId: string | null = null;
      for (const [pid, val] of Object.entries(s.judgments)) {
        if (val !== null && val !== undefined && (prev[pid] === null || prev[pid] === undefined)) {
          judgedId = pid;
          break;
        }
      }
      prevJudgmentsRef.current = s.judgments;
      if (judgedId) {
        const correct = s.judgments[judgedId] === true;
        const p = playersRef.current.find((x) => x.id === judgedId);
        setTurnResult({
          nickname: p?.nickname ?? "",
          emoji: p?.emoji,
          avatarUrl: p?.avatarUrl,
          correct,
          points: correct ? (s.questionPoints ?? 0) : 0,
        });
        playSound(correct ? "correct" : "wrong");
      }
      setLocalJudgments(s.judgments);
      setActivePlayerId(s.activePlayerId ?? null);
    };
    const onCategoryGrid = (data: CategoryGridData) => {
      setCategoryGrid(data);
      setPhase("CATEGORY_PICK");
    };

    channel.bind("lobby:updated", onLobbyUpdated);
    channel.bind("lobby:started", onLobbyStarted);
    channel.bind("game:question", onGameQuestion);
    channel.bind("game:answer-received", onAnswerReceived);
    channel.bind("game:reveal", onReveal);
    channel.bind("game:leaderboard", onLeaderboard);
    channel.bind("game:finished", onFinished);
    channel.bind("game:speedrun-timer", onSpeedrunTimer);
    channel.bind("game:local-state", onLocalState);
    channel.bind("game:category-grid", onCategoryGrid);

    return () => {
      channel.unbind("lobby:updated", onLobbyUpdated);
      channel.unbind("lobby:started", onLobbyStarted);
      channel.unbind("game:question", onGameQuestion);
      channel.unbind("game:answer-received", onAnswerReceived);
      channel.unbind("game:reveal", onReveal);
      channel.unbind("game:leaderboard", onLeaderboard);
      channel.unbind("game:finished", onFinished);
      channel.unbind("game:speedrun-timer", onSpeedrunTimer);
      channel.unbind("game:local-state", onLocalState);
      channel.unbind("game:category-grid", onCategoryGrid);
    };
  }, [channel]);

  const exit = () => {
    localStorage.removeItem("spectatorGameId");
    localStorage.removeItem("spectatorCode");
    router.push("/");
  };

  // ========== RENDER ==========

  // Splash cambio round (categoria singola): copre lo schermo, poi rivela la domanda.
  if (splash) {
    return (
      <CategoryRevealSplash
        category={splash.category}
        roundNumber={splash.roundNumber}
        totalRounds={splash.totalRounds}
        modeLabel={splash.modeLabel}
        onDone={() => setSplash(null)}
      />
    );
  }

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

            {categoryGrid.turnPlayerId && (() => {
              const p = players.find((x) => x.id === categoryGrid.turnPlayerId);
              const name = p ? `${p.emoji || "🎮"} ${p.nickname}` : categoryGrid.turnPlayerNickname;
              return name ? (
                <div className="mb-4 p-3 rounded-xl bg-gold/10 ring-1 ring-gold/40 text-center">
                  <span className="text-sm text-muted mr-2">🎯 Sceglie</span>
                  <span className="text-2xl font-bold">{name}</span>
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
    // Il timer non supera mai il limite: durante l'intro (deadline + intro server) resta pieno.
    const shownRemaining = question.timeLimit > 0 ? Math.min(remaining, question.timeLimit) : remaining;
    return (
      <main className="min-h-screen p-4 md:p-8">
        {announce && <TurnAnnounce player={announce} onDone={() => setAnnounce(null)} />}
        {turnResult && <TurnResult player={turnResult} onDone={() => setTurnResult(null)} />}
        {timeUp && (
          <div className="fixed inset-x-0 top-0 z-[60] flex justify-center pointer-events-none">
            <div className="mt-4 px-10 py-5 rounded-2xl bg-danger text-white text-3xl md:text-5xl font-extrabold shadow-2xl ring-4 ring-white/20 animate-pulse tracking-wide">
              ⏰ TEMPO SCADUTO
            </div>
          </div>
        )}
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
                  style={{ width: `${(shownRemaining / question.timeLimit) * 100}%` }}
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
                <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} audioOnly={question.mediaAudioOnly} maxDuration={question.mediaMaxDuration} className="max-h-72 w-full" />
              </div>
            )}

            <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">{question.text}</h2>

            <div className="text-center mb-8">
              <div className="text-7xl font-bold text-accent tabular-nums">
                {question.timeLimit > 0 ? shownRemaining : "—"}
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
