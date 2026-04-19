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
} from "@/types/socket";
import MediaDisplay from "@/components/MediaDisplay";

type Phase = "LOBBY" | "QUESTION" | "JUDGING" | "REVEAL" | "FINISHED";

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

  useEffect(() => {
    const saved = sessionStorage.getItem("hostCode");
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    if (!socket || !gameId) return;

    socket.emit("host:join", { gameId }, (res) => {
      if (!res.success) {
        alert(res.error || "Impossibile riconnettersi alla partita");
        router.push("/");
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
      setPhase("QUESTION");
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
    };
  }, [socket, gameId, router]);

  const startGame = () => socket?.emit("host:start", { gameId });
  const nextQuestion = () => socket?.emit("host:next", { gameId });
  const playAgain = () => router.push("/host");

  const submitJudgments = () => {
    if (!socket || !judgeData) return;
    const list = Object.entries(judgments).map(([playerId, isCorrect]) => ({
      playerId,
      isCorrect,
    }));
    socket.emit("host:judge", { gameId, judgments: list });
  };

  // === RENDER ===

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

  if (phase === "QUESTION" && question) {
    const isOpenType =
      question.questionType === "OPEN_ANSWER" ||
      question.questionType === "IMAGE_GUESS";

    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <span className="text-muted">
              Domanda {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-muted">
              Risposte: {answeredCount} / {players.length}
            </span>
          </div>

          <div className="relative h-2 bg-surface rounded-full overflow-hidden mb-8">
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-all duration-1000"
              style={{ width: `${(remaining / question.timeLimit) * 100}%` }}
            />
          </div>

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
              {remaining}
            </div>
            <p className="text-muted mt-2">
              {isOpenType
                ? "I giocatori stanno scrivendo la loro risposta..."
                : question.questionType === "WORD_COMPLETION"
                  ? "I giocatori stanno completando la parola..."
                  : "I giocatori stanno rispondendo dal loro dispositivo..."}
            </p>
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
                <div key={p.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted text-sm w-6">#{i + 1}</span>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <span className="text-xl">{p.emoji || "🎮"}</span>
                    )}
                    <span>{p.nickname}</span>
                  </div>
                  <span className="font-bold text-accent">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={nextQuestion} className="btn-primary w-full">
            {question.questionNumber >= question.totalQuestions
              ? "Vedi risultati finali"
              : "Prossima domanda"}
          </button>
        </div>
      </main>
    );
  }

  // LOBBY
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-muted mb-2">I giocatori devono andare su</p>
          <p className="text-xl font-mono mb-6">
            {typeof window !== "undefined" ? window.location.host : ""}/player
          </p>

          <div className="inline-block card px-12 py-8 bg-gradient-to-br from-surface to-background border-accent">
            <p className="text-muted text-sm mb-2">CODICE PARTITA</p>
            <p className="text-6xl md:text-7xl font-bold tracking-widest font-mono">
              {code || "..."}
            </p>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Giocatori ({players.length})</h2>
            {!isConnected && (
              <span className="text-warning text-sm">Riconnessione...</span>
            )}
          </div>
          {players.length === 0 ? (
            <p className="text-muted text-center py-8">
              In attesa dei giocatori...
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-background rounded-lg p-3 text-center animate-fade-in flex flex-col items-center gap-1"
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

        <button
          onClick={startGame}
          disabled={players.length === 0}
          className="btn-primary w-full text-lg py-4"
        >
          {players.length === 0
            ? "Attendi almeno un giocatore"
            : `Avvia partita con ${players.length} giocatore${players.length > 1 ? "i" : ""}`}
        </button>
      </div>
    </main>
  );
}
