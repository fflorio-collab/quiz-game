"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/lib/useSocket";
import { playSound, getSoundEnabled, setSoundEnabled } from "@/lib/sound";
import type { QuestionData, RevealData, PlayerInfo, DuelState } from "@/types/socket";
import MediaDisplay from "@/components/MediaDisplay";

type Phase = "WAITING" | "QUESTION" | "ANSWERED" | "REVEAL" | "FINISHED";

const answerColors = [
  "bg-red-500/20 border-red-500 hover:bg-red-500/30",
  "bg-blue-500/20 border-blue-500 hover:bg-blue-500/30",
  "bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30",
  "bg-green-500/20 border-green-500 hover:bg-green-500/30",
];

// Costruisce un array di caratteri dal template: lettere fisse e indici dei blank
function parseTemplate(template: string) {
  return template.split("").map((ch, i) => ({ ch, isBlank: ch === "_", index: i }));
}

// Barra degli aiuti mostrata sotto ogni tipo di domanda
function LifelineBar({
  fiftyRemaining, skipRemaining, onFifty, onSkip, showFifty,
}: {
  fiftyRemaining: number; skipRemaining: number;
  onFifty: () => void; onSkip: () => void;
  showFifty: boolean; // 50/50 è disponibile solo per MC
}) {
  // Non mostrare la barra se nessun aiuto è disponibile
  if ((!showFifty || fiftyRemaining <= 0) && skipRemaining <= 0) return null;
  return (
    <div className="flex gap-2 mt-3">
      {showFifty && fiftyRemaining > 0 && (
        <button onClick={onFifty}
          className="flex-1 py-2 rounded-lg border-2 border-accent/40 text-accent text-sm hover:bg-accent/10 active:scale-95 transition-transform">
          🎯 50/50 <span className="text-xs opacity-70">×{fiftyRemaining}</span>
        </button>
      )}
      {skipRemaining > 0 && (
        <button onClick={onSkip}
          className="flex-1 py-2 rounded-lg border-2 border-warning/40 text-warning text-sm hover:bg-warning/10 active:scale-95 transition-transform">
          ⏭ Salta <span className="text-xs opacity-70">×{skipRemaining}</span>
        </button>
      )}
    </div>
  );
}

// Overlay animazione "aiuto usato"
function LifelineOverlay({ kind }: { kind: "fifty" | "skip" | null }) {
  if (!kind) return null;
  const isFifty = kind === "fifty";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className={`relative text-center ${isFifty ? "text-accent" : "text-warning"} animate-slide-up`}>
        <div className="text-[140px] leading-none animate-pulse-slow">{isFifty ? "🎯" : "⏭"}</div>
        <div className="text-4xl font-bold tracking-widest mt-2">{isFifty ? "50/50!" : "SALTATA!"}</div>
        <div className="text-sm text-muted mt-2">
          {isFifty ? "Due risposte sbagliate sono state nascoste" : "Nessun punto, ma nessuna eliminazione"}
        </div>
      </div>
    </div>
  );
}

// Overlay animazione "scommessa vinta/persa"
function WagerOverlay({ kind, amount }: { kind: "win" | "lose" | null; amount: number }) {
  if (!kind) return null;
  const isWin = kind === "win";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className={`absolute inset-0 ${isWin ? "bg-success/30" : "bg-danger/30"} backdrop-blur-sm`} />
      <div className={`relative text-center ${isWin ? "text-success" : "text-danger"} animate-slide-up`}>
        <div className="text-[140px] leading-none animate-pulse-slow">{isWin ? "🎉" : "💸"}</div>
        <div className="text-5xl font-bold tracking-widest mt-2">
          {isWin ? `+${amount}` : `-${amount}`}
        </div>
        <div className="text-sm text-white/80 mt-2">
          {isWin ? "Scommessa vinta!" : "Scommessa persa!"}
        </div>
      </div>
    </div>
  );
}

// Overlay "streak milestone"
function StreakOverlay({ streak, show }: { streak: number; show: boolean }) {
  if (!show || streak < 2) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
      <div className="relative text-center animate-slide-up">
        <div className="text-[160px] leading-none animate-pulse-slow">🔥</div>
        <div className="text-5xl font-bold text-orange-400 tracking-widest">×{streak} STREAK!</div>
        <div className="text-lg text-white/90 mt-2">
          Moltiplicatore punti attivo
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [myEmoji, setMyEmoji] = useState("🎮");
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("WAITING");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [openText, setOpenText] = useState("");
  const [wordBlanks, setWordBlanks] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [finalRanking, setFinalRanking] = useState<PlayerInfo[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [amIEliminated, setAmIEliminated] = useState(false);
  const [speedrunRemaining, setSpeedrunRemaining] = useState<number | null>(null);
  const [jeopardyWaiting, setJeopardyWaiting] = useState(false);
  const [hiddenAnswerIds, setHiddenAnswerIds] = useState<string[]>([]);
  // Lifelines: quantità configurate dall'host e uso del giocatore
  const [fiftyFiftyCount, setFiftyFiftyCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(0);
  const [skipUsed, setSkipUsed] = useState(0);
  // Animazione uso aiuto / streak / wager
  const [lifelineAnim, setLifelineAnim] = useState<"fifty" | "skip" | null>(null);
  const [streak, setStreak] = useState(0);
  const [streakAnim, setStreakAnim] = useState(false);
  const [pendingWager, setPendingWager] = useState(0);
  const [wagerAnim, setWagerAnim] = useState<"win" | "lose" | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  // 100 Secondi
  const [duel, setDuel] = useState<DuelState | null>(null);
  const [duelEndedBanner, setDuelEndedBanner] = useState<{ winnerNickname: string; loserNickname: string } | null>(null);

  useEffect(() => { setSoundOn(getSoundEnabled()); }, []);
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound("countdown"); // mini feedback
  };
  const firstBlankRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pid = localStorage.getItem("playerId");
    const nick = localStorage.getItem("playerNickname");
    if (!pid || !nick) { router.push("/player"); return; }
    setPlayerId(pid);
    setNickname(nick);
    setMyEmoji(localStorage.getItem("playerEmoji") || "🎮");
    setMyAvatarUrl(localStorage.getItem("playerAvatarUrl") ?? null);
  }, [router]);

  useEffect(() => {
    if (!socket || !playerId || !gameId) return;

    // Rejoin — recupera lo stato corrente della partita
    socket.emit("player:rejoin", { gameId, playerId }, (res) => {
      if (!res.success) {
        // Partita non esistente/finita/player non trovato → torna al form
        localStorage.removeItem("playerId");
        localStorage.removeItem("playerGameId");
        localStorage.removeItem("playerGameCode");
        alert(res.error || "Impossibile rientrare in partita");
        router.push("/player");
        return;
      }
      const s = res.state;
      // Limiti aiuti per questa partita
      if (typeof s.fiftyFiftyCount === "number") setFiftyFiftyCount(s.fiftyFiftyCount);
      if (typeof s.skipCount === "number") setSkipCount(s.skipCount);
      // Aggiorna punteggio + contatori aiuti dall'elenco players
      const me = s.players.find((p) => p.id === playerId);
      if (me) {
        setMyScore(me.score);
        if (me.eliminated) setAmIEliminated(true);
        if (typeof me.fiftyFiftyUsed === "number") setFiftyFiftyUsed(me.fiftyFiftyUsed);
        if (typeof me.skipUsed === "number") setSkipUsed(me.skipUsed);
        if (typeof me.streak === "number") setStreak(me.streak);
        if (typeof me.pendingWager === "number") setPendingWager(me.pendingWager);
      }
      const rank = s.players.findIndex((p) => p.id === playerId);
      if (rank >= 0) setMyRank(rank + 1);

      if (s.gameStatus === "FINISHED") {
        setFinalRanking(s.finalRanking ?? s.players);
        setPhase("FINISHED");
        return;
      }
      if (s.gameStatus === "LOBBY") {
        setPhase("WAITING");
        if (s.duel && !s.duel.finished) setDuel(s.duel);
        return;
      }
      // 100 Secondi attivo: la schermata duello prevale
      if (s.duel && !s.duel.finished) setDuel(s.duel);
      // PLAYING
      if (s.judging) {
        // Il player ha già risposto se era presente nelle answers → mostra ANSWERED
        const answered = s.judging.answers.some((a) => a.playerId === playerId);
        setPhase(answered ? "ANSWERED" : "WAITING");
      } else if (s.isRevealing && s.reveal) {
        setReveal(s.reveal);
        const myResult = s.reveal.playerResults.find((r) => r.playerId === playerId);
        if (myResult) setMyScore(myResult.totalScore);
        setPhase("REVEAL");
      } else if (s.currentQuestion) {
        setQuestion(s.currentQuestion);
        setRemaining(s.remainingTime ?? s.currentQuestion.timeLimit);
        setQuestionStartTime(Date.now() - ((s.currentQuestion.timeLimit - (s.remainingTime ?? s.currentQuestion.timeLimit)) * 1000));
        if (s.currentQuestion.questionType === "WORD_COMPLETION" && s.currentQuestion.wordTemplate) {
          const blanks = s.currentQuestion.wordTemplate.split("").filter((ch: string) => ch === "_");
          setWordBlanks(new Array(blanks.length).fill(""));
        }
        setPhase(s.alreadyAnswered ? "ANSWERED" : "QUESTION");
      } else {
        setPhase("WAITING");
      }
    });

    socket.on("lobby:started", () => setPhase("WAITING"));

    socket.on("game:question", (q) => {
      setQuestion(q);
      setSelectedAnswerId(null);
      setOpenText("");
      setReveal(null);
      setRemaining(q.timeLimit);
      setQuestionStartTime(Date.now());
      setHiddenAnswerIds([]); // reset 50/50 per-domanda
      setJeopardyWaiting(false);

      // Inizializza i blank per WORD_COMPLETION
      if (q.questionType === "WORD_COMPLETION" && q.wordTemplate) {
        const blanks = q.wordTemplate.split("").filter((ch) => ch === "_");
        setWordBlanks(new Array(blanks.length).fill(""));
      }

      setPhase("QUESTION");
    });

    socket.on("game:timer", ({ remaining }) => {
      setRemaining(remaining);
      // Tick negli ultimi 5 secondi (solo quando non si è già risposto)
      if (remaining > 0 && remaining <= 5) {
        playSound("tick");
      }
    });
    socket.on("game:speedrun-timer", ({ remaining }) => setSpeedrunRemaining(remaining));
    socket.on("game:jeopardy-grid", () => {
      setJeopardyWaiting(true);
      setQuestion(null);
      setReveal(null);
      setPhase("WAITING");
    });

    socket.on("game:reveal", (data) => {
      setReveal(data);
      const myResult = data.playerResults.find((r) => r.playerId === playerId);
      if (myResult) {
        setMyScore(myResult.totalScore);
        playSound(myResult.wasCorrect ? "correct" : "wrong");
        // Se avevo una scommessa attiva, mostra l'animazione vinci/perdi
        if (pendingWager > 0) {
          setWagerAnim(myResult.wasCorrect ? "win" : "lose");
          playSound(myResult.wasCorrect ? "wager-win" : "wager-lose");
          setTimeout(() => setWagerAnim(null), 1800);
        }
      }
      setPhase("REVEAL");
    });

    socket.on("game:leaderboard", ({ players }) => {
      const idx = players.findIndex((p) => p.id === playerId);
      if (idx >= 0) {
        const me = players[idx];
        setMyRank(idx + 1);
        setMyScore(me.score);
        if (me.eliminated) setAmIEliminated(true);
        if (typeof me.fiftyFiftyUsed === "number") setFiftyFiftyUsed(me.fiftyFiftyUsed);
        if (typeof me.skipUsed === "number") setSkipUsed(me.skipUsed);
        if (typeof me.streak === "number") {
          // Flash animazione quando raggiunge un milestone (2, 4, 7, 10)
          const milestone = [2, 4, 7, 10].includes(me.streak) && me.streak > streak;
          setStreak(me.streak);
          if (milestone) {
            setStreakAnim(true);
            playSound("streak");
            setTimeout(() => setStreakAnim(false), 1500);
          }
        }
        // Dopo una domanda la scommessa si azzera lato server
        if (typeof me.pendingWager === "number") setPendingWager(me.pendingWager);
      }
    });

    socket.on("lobby:updated", ({ players }) => {
      const me = players.find((p) => p.id === playerId);
      if (me?.eliminated) setAmIEliminated(true);
    });

    socket.on("game:finished", ({ players }) => {
      playSound("finish");
      setFinalRanking(players);
      setPhase("FINISHED");
    });

    // 100 Secondi: stato duello aggiornato dal server (~250ms)
    socket.on("duel:state", (st) => setDuel(st));
    socket.on("duel:ended", ({ winnerNickname, loserNickname }) => {
      setDuelEndedBanner({ winnerNickname, loserNickname });
      setTimeout(() => { setDuelEndedBanner(null); setDuel(null); }, 5000);
    });

    return () => {
      socket.off("lobby:started");
      socket.off("game:question");
      socket.off("game:timer");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("lobby:updated");
      socket.off("game:speedrun-timer");
      socket.off("game:jeopardy-grid");
      socket.off("game:finished");
      socket.off("duel:state");
      socket.off("duel:ended");
    };
  }, [socket, playerId]);

  // Focus sul primo blank quando la domanda WORD_COMPLETION appare
  useEffect(() => {
    if (phase === "QUESTION" && question?.questionType === "WORD_COMPLETION") {
      setTimeout(() => firstBlankRef.current?.focus(), 100);
    }
  }, [phase, question]);


  const submitMultipleChoice = (answerId: string) => {
    if (!socket || !playerId || !question || selectedAnswerId) return;
    setSelectedAnswerId(answerId);
    socket.emit("player:answer", {
      playerId,
      gameId,
      answerId,
      timeTaken: Date.now() - questionStartTime,
    });
    setPhase("ANSWERED");
  };

  const submitTextAnswer = (text: string) => {
    if (!socket || !playerId || !question || !text.trim()) return;
    socket.emit("player:answer", {
      playerId,
      gameId,
      answerText: text.trim(),
      timeTaken: Date.now() - questionStartTime,
    });
    setPhase("ANSWERED");
  };

  const submitWordCompletion = () => {
    if (!question?.wordTemplate) return;
    const template = question.wordTemplate;
    let blankIdx = 0;
    const filled = template
      .split("")
      .map((ch) => (ch === "_" ? (wordBlanks[blankIdx++] ?? "") : ch))
      .join("");
    submitTextAnswer(filled);
  };

  const fiftyFiftyRemaining = Math.max(0, fiftyFiftyCount - fiftyFiftyUsed);
  const skipRemaining = Math.max(0, skipCount - skipUsed);

  // Aiuto 50/50 (solo MC): chiede al server 2 risposte sbagliate da nascondere
  const useFiftyFifty = () => {
    if (!socket || !playerId || !question || fiftyFiftyRemaining <= 0) return;
    if (question.questionType !== "MULTIPLE_CHOICE") return;
    socket.emit("player:fifty-fifty", { playerId, gameId, gameQuestionId: question.gameQuestionId }, (res) => {
      if ("error" in res) return;
      setHiddenAnswerIds(res.hideIds);
      setFiftyFiftyUsed((n) => n + 1);
      setLifelineAnim("fifty");
      playSound("lifeline");
      setTimeout(() => setLifelineAnim(null), 1200);
    });
  };

  // Scommessa "doppio o niente": rischia N punti del proprio punteggio sulla prossima domanda
  const setWager = (amount: number) => {
    if (!socket || !playerId) return;
    socket.emit("player:wager", { playerId, gameId, amount }, (res) => {
      if ("error" in res) return;
      setPendingWager(res.wager);
    });
  };

  // Aiuto Salto: registra una risposta nulla che non elimina (disponibile per tutte le modalità)
  const useSkip = () => {
    if (!socket || !playerId || !question || skipRemaining <= 0 || selectedAnswerId) return;
    setSkipUsed((n) => n + 1);
    setLifelineAnim("skip");
    playSound("lifeline");
    setTimeout(() => setLifelineAnim(null), 1200);
    socket.emit("player:answer", {
      playerId,
      gameId,
      timeTaken: Date.now() - questionStartTime,
      skipped: true,
    });
    // Passa a ANSWERED dopo la breve animazione
    setTimeout(() => setPhase("ANSWERED"), 800);
  };

  // === RENDER ===

  // 100 Secondi: il duello prevale su qualsiasi altra fase
  if (duel && !duel.finished) {
    const amIA = playerId === duel.playerA.id;
    const amIB = playerId === duel.playerB.id;
    const amIDueler = amIA || amIB;
    const meActive = amIDueler && playerId === duel.activePlayerId;
    const opp = amIA ? duel.playerB : amIB ? duel.playerA : null;

    const fmt = (ms: number) => (ms / 1000).toFixed(1);
    const pct = (ms: number) => Math.max(0, Math.min(100, (ms / (duel.durationSec * 1000)) * 100));

    return (
      <main className="min-h-screen p-4 flex flex-col">
        <div className="text-center mb-4">
          <div className="chip-gold inline-flex mb-2">⏱ 100 Secondi</div>
          <h2 className="text-xl font-bold">Duello 1v1</h2>
          {duel.paused && (
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-warning/20 text-warning text-sm font-semibold">
              ⏸ In pausa
            </div>
          )}
        </div>

        {/* Barre timer dei due sfidanti */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[duel.playerA, duel.playerB].map((p) => {
            const isActive = p.id === duel.activePlayerId;
            return (
              <div key={p.id} className={`card ${isActive ? "border-accent" : "opacity-70"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : <span className="text-xl">{p.emoji || "🎮"}</span>}
                  <span className="font-semibold truncate">{p.nickname}</span>
                </div>
                <div className="text-3xl font-bold tabular-nums text-accent">{fmt(p.timeLeftMs)}<span className="text-sm text-muted">s</span></div>
                <div className="h-2 bg-surface rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-accent transition-all duration-200" style={{ width: `${pct(p.timeLeftMs)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {amIDueler ? (
          <div className="flex-1 flex flex-col">
            <div className="card mb-4 text-center">
              <p className={`text-sm mb-2 ${meActive ? "text-accent font-bold" : "text-muted"}`}>
                {meActive ? "🎤 Tocca a te — rispondi a voce" : `⏳ Tocca a ${opp?.nickname ?? "avversario"}`}
              </p>
              <p className="text-lg font-semibold mb-3">{duel.question?.text ?? "—"}</p>
              {duel.question && (
                <>
                  <p className="text-xs text-muted mb-1">Parola di {duel.question.length} lettere</p>
                  <p className="text-3xl font-bold tracking-[0.3em] tabular-nums">{duel.question.masked}</p>
                </>
              )}
            </div>
            {duel.lastResult && (
              <div className={`text-center text-sm ${duel.lastResult.correct ? "text-success" : "text-danger"}`}>
                Ultima: {duel.lastResult.correct ? "✓ corretta" : `✗ era "${duel.lastResult.correctAnswer}"`}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4 animate-pulse-slow">👀</div>
            <h3 className="text-xl font-bold mb-2">Duello in corso</h3>
            <p className="text-muted">Stai guardando {duel.playerA.nickname} vs {duel.playerB.nickname}</p>
            {duel.question && (
              <>
                <p className="text-sm text-muted mt-4 italic">&ldquo;{duel.question.text}&rdquo;</p>
                <p className="text-2xl font-bold tracking-[0.3em] mt-2">{duel.question.masked}</p>
              </>
            )}
          </div>
        )}
      </main>
    );
  }

  if (duelEndedBanner) {
    const iAmWinner = nickname === duelEndedBanner.winnerNickname;
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-slide-up">
          <div className="text-7xl mb-4">{iAmWinner ? "🏆" : "💥"}</div>
          <h2 className="text-2xl font-bold mb-2">Duello finito</h2>
          <p className="text-muted">Vince <b>{duelEndedBanner.winnerNickname}</b></p>
          <p className="text-sm text-muted mt-1">Eliminato: {duelEndedBanner.loserNickname}</p>
        </div>
      </main>
    );
  }

  if (phase === "FINISHED") {
    const myIndex = finalRanking.findIndex((p) => p.id === playerId);
    const myFinalRank = myIndex + 1;
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-slide-up">
          <div className="text-7xl mb-4">
            {myFinalRank === 1 ? "🥇" : myFinalRank === 2 ? "🥈" : myFinalRank === 3 ? "🥉" : "🎯"}
          </div>
          <h1 className="text-3xl font-bold mb-2">Partita finita!</h1>
          <p className="text-xl text-muted mb-6">
            Sei arrivato {myFinalRank}° su {finalRanking.length}
          </p>
          <div className="card mb-6">
            <p className="text-muted text-sm">Il tuo punteggio</p>
            <p className="text-5xl font-bold text-accent">{myScore}</p>
          </div>
          <div className="card text-left">
            <h3 className="font-bold mb-3">Top 3</h3>
            {finalRanking.slice(0, 3).map((p, i) => (
              <div
                key={p.id}
                className={`flex justify-between items-center py-2 ${p.id === playerId ? "text-accent font-bold" : ""}`}
              >
                <span className="flex items-center gap-2">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span>{p.emoji || "🎮"}</span>
                  )}
                  {p.nickname}
                </span>
                <span>{p.score}</span>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/")} className="btn-primary w-full mt-6">
            Torna alla home
          </button>
        </div>
      </main>
    );
  }

  if (phase === "REVEAL" && reveal && question) {
    const myResult = reveal.playerResults.find((r) => r.playerId === playerId);
    const wasCorrect = myResult?.wasCorrect ?? false;
    const isOpenJudged =
      reveal.questionType === "OPEN_ANSWER" || reveal.questionType === "IMAGE_GUESS" || reveal.questionType === "GHIGLIOTTINA";

    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <WagerOverlay kind={wagerAnim} amount={pendingWager} />
        <StreakOverlay streak={streak} show={streakAnim} />
        <div className="w-full max-w-md text-center animate-slide-up">
          {reveal.nextRound && (
            <div className="mb-4 p-3 rounded-xl bg-accent/10 ring-1 ring-accent/40">
              <p className="text-xs text-muted">
                Round {reveal.nextRound.roundNumber} / {reveal.nextRound.totalRounds}
              </p>
              <p className="font-bold">
                🏆 Prossima: {reveal.nextRound.modeLabel}
              </p>
            </div>
          )}
          <div className="text-6xl mb-4">{wasCorrect ? "✅" : "❌"}</div>
          <h1 className="text-3xl font-bold mb-2">
            {wasCorrect ? "Corretto!" : "Sbagliato"}
          </h1>
          {myResult && wasCorrect && (
            <p className="text-xl text-success mb-4">+{myResult.pointsEarned} punti</p>
          )}
          {isOpenJudged ? (
            <p className="text-muted mb-6">
              {wasCorrect ? "L&apos;admin ha accettato la tua risposta!" : "L&apos;admin non ha accettato la tua risposta."}
            </p>
          ) : (
            <p className="text-muted mb-6">
              Risposta corretta:{" "}
              <strong className="text-white">{reveal.correctAnswerText}</strong>
            </p>
          )}
          <div className="card mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted text-sm">Il tuo punteggio</p>
                <p className="text-3xl font-bold text-accent">{myScore}</p>
                {streak >= 2 && (
                  <p className="text-xs text-orange-400 mt-1">🔥 Streak ×{streak} · bonus {streak >= 10 ? "+200%" : streak >= 7 ? "+100%" : streak >= 4 ? "+50%" : "+25%"}</p>
                )}
              </div>
              {myRank && (
                <div>
                  <p className="text-muted text-sm">Posizione</p>
                  <p className="text-3xl font-bold">#{myRank}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pannello scommessa per la prossima domanda */}
          {myScore > 0 && !amIEliminated && (
            <div className="card mb-4 border-gold/40 bg-gold/5">
              <p className="text-sm font-bold text-gold mb-1">🎲 Doppio o niente sulla prossima</p>
              {pendingWager > 0 ? (
                <div>
                  <p className="text-xs text-muted mb-2">
                    Scommessa attiva: <span className="font-bold text-gold">{pendingWager} punti</span>
                  </p>
                  <button onClick={() => setWager(0)}
                    className="w-full py-2 rounded-lg border-2 border-border text-muted hover:border-danger hover:text-danger text-xs">
                    Annulla scommessa
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted mb-2">Se indovini vinci il doppio, se sbagli perdi la posta.</p>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.1, 0.25, 0.5, 1].map((pct) => {
                      const amount = Math.max(1, Math.floor(myScore * pct));
                      return (
                        <button key={pct} onClick={() => setWager(amount)}
                          className="py-2 rounded-lg border-2 border-gold/40 text-gold hover:bg-gold/10 text-xs font-medium">
                          {Math.round(pct * 100)}%<br />
                          <span className="text-[10px] opacity-70">{amount}pt</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-muted text-sm">In attesa della prossima domanda...</p>
        </div>
      </main>
    );
  }

  if (phase === "ANSWERED") {
    const isOpenType =
      question?.questionType === "OPEN_ANSWER" ||
      question?.questionType === "IMAGE_GUESS" ||
      question?.questionType === "GHIGLIOTTINA";
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <LifelineOverlay kind={lifelineAnim} />
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse-slow">⏳</div>
          <h2 className="text-xl font-bold mb-2">Risposta inviata</h2>
          <p className="text-muted">
            {isOpenType
              ? "In attesa che l'admin giudichi..."
              : "In attesa degli altri giocatori..."}
          </p>
          <div className="mt-6 text-4xl font-bold tabular-nums">{question && question.timeLimit > 0 ? remaining : "♾️"}</div>
        </div>
      </main>
    );
  }

  // Se eliminato in modalità "Ultimo in piedi" non può più rispondere
  // (a questo punto phase è solo WAITING o QUESTION, FINISHED/REVEAL/ANSWERED hanno già fatto return)
  if (amIEliminated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-slide-up">
          <div className="text-7xl mb-4 animate-pulse-slow">💀</div>
          <h1 className="text-3xl font-bold mb-2">Eliminato</h1>
          <p className="text-muted mb-6">
            Hai risposto male. In modalità <strong className="text-danger">Ultimo in piedi</strong> questo significa fine corsa.
          </p>
          <div className="card">
            <p className="text-muted text-sm">Il tuo punteggio finale</p>
            <p className="text-4xl font-bold text-accent">{myScore}</p>
          </div>
          <p className="text-muted text-sm mt-6">Resta a guardare i superstiti fino alla fine della partita...</p>
        </div>
      </main>
    );
  }

  if (phase === "QUESTION" && question) {
    // --- MULTIPLE CHOICE ---
    if (question.questionType === "MULTIPLE_CHOICE") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }}
            />
          </div>
          <div className="card mb-4 text-center">
            <p className="text-lg font-semibold">{question.text}</p>
          </div>
          {question.imageUrl && (
            <div className="flex justify-center mb-4">
              <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} className="max-h-40" />
            </div>
          )}
          {/* Banner speedrun/vite */}
          {(speedrunRemaining !== null || amIEliminated === false) && (
            <div className="flex gap-2 mb-3 text-xs">
              {speedrunRemaining !== null && (
                <span className="flex-1 text-center py-1 rounded bg-accent/10 border border-accent/30 text-accent font-mono">
                  ⚡ {speedrunRemaining}s
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
            {question.answers.map((a, i) => {
              const hidden = hiddenAnswerIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => submitMultipleChoice(a.id)}
                  disabled={!!selectedAnswerId || hidden}
                  className={`answer-tile ${answerColors[i]} ${selectedAnswerId === a.id ? "ring-4 ring-white" : ""} ${hidden ? "opacity-20 line-through pointer-events-none" : ""}`}
                >
                  <span className="font-bold text-2xl mr-3">{String.fromCharCode(65 + i)}</span>
                  <span>{a.text}</span>
                </button>
              );
            })}
          </div>
          {/* Aiuti MC: 50/50 + Salto */}
          {!selectedAnswerId && <LifelineBar
            fiftyRemaining={fiftyFiftyRemaining} skipRemaining={skipRemaining}
            onFifty={useFiftyFifty} onSkip={useSkip} showFifty={true}
          />}
        </main>
      );
    }

    // --- OPEN ANSWER / GHIGLIOTTINA ---
    if (question.questionType === "OPEN_ANSWER" || question.questionType === "GHIGLIOTTINA") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }}
            />
          </div>
          <div className="card mb-4 text-center">
            <p className="text-lg font-semibold">{question.text}</p>
          </div>
          {question.imageUrl && (
            <div className="flex justify-center mb-4">
              <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} className="max-h-40" />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-4">
            <textarea
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              placeholder="Scrivi la tua risposta..."
              className="input flex-1 resize-none min-h-[120px] text-lg"
              maxLength={300}
            />
            <button
              onClick={() => submitTextAnswer(openText)}
              disabled={!openText.trim()}
              className="btn-primary w-full text-lg py-4"
            >
              Invia risposta
            </button>
            <LifelineBar fiftyRemaining={0} skipRemaining={skipRemaining}
              onFifty={useFiftyFifty} onSkip={useSkip} showFifty={false} />
          </div>
        </main>
      );
    }

    // --- WORD COMPLETION ---
    if (question.questionType === "WORD_COMPLETION" && question.wordTemplate) {
      const templateChars = parseTemplate(question.wordTemplate);
      let blankCounter = 0;

      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }}
            />
          </div>
          <div className="card mb-6 text-center">
            <p className="text-lg font-semibold">{question.text}</p>
          </div>

          {/* Template parola con input per le lettere mancanti */}
          <div className="card mb-6 flex justify-center">
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {templateChars.map((item) => {
                if (!item.isBlank) {
                  return (
                    <div
                      key={item.index}
                      className="w-10 h-12 flex items-center justify-center text-2xl font-bold font-mono border-2 border-border rounded-lg bg-surface"
                    >
                      {item.ch}
                    </div>
                  );
                }
                const blankIdx = blankCounter++;
                return (
                  <input
                    key={item.index}
                    ref={blankIdx === 0 ? firstBlankRef : undefined}
                    type="text"
                    maxLength={1}
                    value={wordBlanks[blankIdx] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().slice(-1);
                      setWordBlanks((prev) => {
                        const next = [...prev];
                        next[blankIdx] = val;
                        return next;
                      });
                      // Auto-focus next blank
                      if (val) {
                        const inputs = document.querySelectorAll<HTMLInputElement>(
                          "[data-blank]"
                        );
                        inputs[blankIdx + 1]?.focus();
                      }
                    }}
                    data-blank={blankIdx}
                    className="w-10 h-12 text-center text-2xl font-bold font-mono border-2 border-accent rounded-lg bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent uppercase"
                  />
                );
              })}
            </div>
          </div>

          <button
            onClick={submitWordCompletion}
            disabled={wordBlanks.some((b) => !b)}
            className="btn-primary w-full text-lg py-4"
          >
            Conferma
          </button>
          <LifelineBar fiftyRemaining={0} skipRemaining={skipRemaining}
            onFifty={useFiftyFifty} onSkip={useSkip} showFifty={false} />
        </main>
      );
    }

    // --- IMAGE GUESS ---
    if (question.questionType === "IMAGE_GUESS") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }}
            />
          </div>

          {question.imageUrl && (
            <div className="mb-4 flex justify-center">
              <MediaDisplay imageUrl={question.imageUrl} mediaType={question.mediaType} className="max-h-56 w-full" />
            </div>
          )}

          <div className="card mb-4 text-center">
            <p className="text-lg font-semibold">{question.text}</p>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <input
              type="text"
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && openText.trim()) submitTextAnswer(openText);
              }}
              placeholder="Scrivi il nome del luogo..."
              className="input text-lg"
              maxLength={200}
              autoFocus
            />
            <button
              onClick={() => submitTextAnswer(openText)}
              disabled={!openText.trim()}
              className="btn-primary w-full text-lg py-4"
            >
              Invia risposta
            </button>
            <LifelineBar fiftyRemaining={0} skipRemaining={skipRemaining}
              onFifty={useFiftyFifty} onSkip={useSkip} showFifty={false} />
          </div>
        </main>
      );
    }

    // --- ONLY CONNECT: 4 elementi, trova il link ---
    if (question.questionType === "ONLY_CONNECT") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }} />
          </div>

          <div className="card mb-4 text-center">
            <p className="text-sm text-muted mb-1">Cosa hanno in comune?</p>
            <p className="font-semibold">{question.text}</p>
          </div>

          {/* 4 items in griglia 2x2 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {question.answers.map((item) => (
              <div key={item.id}
                className="p-4 rounded-xl border-2 border-accent/40 bg-accent/5 text-center font-semibold">
                {item.text}
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <input type="text" value={openText} onChange={(e) => setOpenText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && openText.trim()) submitTextAnswer(openText); }}
              placeholder="Qual è il collegamento?" className="input text-lg" maxLength={200} autoFocus />
            <button onClick={() => submitTextAnswer(openText)} disabled={!openText.trim()}
              className="btn-primary w-full text-lg py-4">
              Invia risposta
            </button>
            <LifelineBar fiftyRemaining={0} skipRemaining={skipRemaining}
              onFifty={useFiftyFifty} onSkip={useSkip} showFifty={false} />
          </div>
        </main>
      );
    }

    // --- INDIZIO SVELATO: immagine che si schiarisce col tempo ---
    if (question.questionType === "CLUE_REVEAL") {
      const total = question.timeLimit > 0 ? question.timeLimit : 30;
      const elapsed = total - remaining;
      // Blur da 40px (all'inizio) a 0 (alla fine)
      const progress = Math.min(1, Math.max(0, elapsed / total));
      const blurPx = Math.round(40 * (1 - progress));

      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }} />
          </div>

          <div className="card mb-4 text-center">
            <p className="text-lg font-semibold">{question.text}</p>
          </div>

          {/* Immagine con blur progressivo */}
          {question.imageUrl && (
            <div className="flex justify-center mb-4 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.imageUrl}
                alt="Indovina"
                className="max-h-64 w-auto object-contain transition-all duration-1000"
                style={{ filter: `blur(${blurPx}px)` }}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col gap-4">
            <input type="text" value={openText} onChange={(e) => setOpenText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && openText.trim()) submitTextAnswer(openText); }}
              placeholder="Scrivi la tua risposta..." className="input text-lg" maxLength={200} autoFocus />
            <button onClick={() => submitTextAnswer(openText)} disabled={!openText.trim()}
              className="btn-primary w-full text-lg py-4">
              Invia risposta
            </button>
            <LifelineBar fiftyRemaining={0} skipRemaining={skipRemaining}
              onFifty={useFiftyFifty} onSkip={useSkip} showFifty={false} />
          </div>
        </main>
      );
    }

    // --- REAZIONE A CATENA: 3 indizi progressivi ---
    if (question.questionType === "REACTION_CHAIN") {
      const total = question.timeLimit > 0 ? question.timeLimit : 30;
      const elapsed = total - remaining;
      // Tier 1 (0-33%): solo indizio 1 · Tier 2 (33-67%): 1+2 · Tier 3 (67-100%): tutti
      const cluesVisible = elapsed < total / 3 ? 1 : elapsed < (2 * total) / 3 ? 2 : 3;

      return (
        <main className="min-h-screen p-4 flex flex-col">
          <LifelineOverlay kind={lifelineAnim} />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">
              {question.timeLimit > 0 ? remaining : "♾️"}
              {streak >= 2 && <span className="ml-2 text-sm text-orange-400">🔥×{streak}</span>}
              {pendingWager > 0 && <span className="ml-2 text-sm text-gold">🎲{pendingWager}</span>}
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${question.timeLimit > 0 ? (remaining / question.timeLimit) * 100 : 100}%` }}
            />
          </div>

          <div className="card mb-4 text-center">
            <p className="text-sm text-muted mb-1">Indovina dagli indizi:</p>
            <p className="font-semibold">{question.text}</p>
          </div>

          {/* 3 indizi progressivi */}
          <div className="space-y-2 mb-4">
            {question.answers.map((clue, i) => {
              const revealed = i < cluesVisible;
              const isLatest = i === cluesVisible - 1;
              return (
                <div
                  key={clue.id}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    revealed
                      ? isLatest
                        ? "border-accent bg-accent/10 text-white animate-slide-up"
                        : "border-border bg-surface text-muted"
                      : "border-dashed border-border/40 bg-surface/30 text-muted/50"
                  }`}
                >
                  <span className="text-xs font-bold mr-2">#{i + 1}</span>
                  {revealed ? clue.text : "... in arrivo ..."}
                </div>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <input
              type="text"
              value={openText}
              onChange={(e) => setOpenText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && openText.trim()) submitTextAnswer(openText); }}
              placeholder="Scrivi la parola..."
              className="input text-lg"
              maxLength={100}
              autoFocus
            />
            <button onClick={() => submitTextAnswer(openText)} disabled={!openText.trim()}
              className="btn-primary w-full text-lg py-4">
              Invia risposta
            </button>
            <LifelineBar fiftyRemaining={0} skipRemaining={skipRemaining}
              onFifty={useFiftyFifty} onSkip={useSkip} showFifty={false} />
          </div>
        </main>
      );
    }
  }

  // WAITING
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <button onClick={toggleSound}
        className="fixed top-3 right-3 z-30 w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-lg hover:border-accent"
        title={soundOn ? "Audio attivo · tocca per silenziare" : "Audio muto · tocca per attivare"}>
        {soundOn ? "🔊" : "🔇"}
      </button>
      <div className="text-center animate-fade-in">
        {myAvatarUrl ? (
          <img src={myAvatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-accent mx-auto mb-4" />
        ) : (
          <div className="text-7xl mb-4">{jeopardyWaiting ? "🎯" : myEmoji}</div>
        )}
        <h2 className="text-2xl font-bold mb-2">Ciao {nickname}!</h2>
        <p className="text-muted">
          {jeopardyWaiting ? "L'host sta scegliendo la prossima cella..." : "In attesa dell'host..."}
        </p>
        {!isConnected && (
          <p className="text-warning text-sm mt-4">Riconnessione...</p>
        )}
      </div>
    </main>
  );
}
