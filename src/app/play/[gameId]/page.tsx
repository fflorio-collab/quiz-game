"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/lib/useSocket";
import { playSound } from "@/lib/sound";
import type { QuestionData, RevealData, PlayerInfo } from "@/types/socket";
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
  const firstBlankRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pid = sessionStorage.getItem("playerId");
    const nick = sessionStorage.getItem("playerNickname");
    if (!pid || !nick) { router.push("/player"); return; }
    setPlayerId(pid);
    setNickname(nick);
    setMyEmoji(sessionStorage.getItem("playerEmoji") || "🎮");
    setMyAvatarUrl(sessionStorage.getItem("playerAvatarUrl") ?? null);
  }, [router]);

  useEffect(() => {
    if (!socket || !playerId) return;

    socket.on("lobby:started", () => setPhase("WAITING"));

    socket.on("game:question", (q) => {
      setQuestion(q);
      setSelectedAnswerId(null);
      setOpenText("");
      setReveal(null);
      setRemaining(q.timeLimit);
      setQuestionStartTime(Date.now());

      // Inizializza i blank per WORD_COMPLETION
      if (q.questionType === "WORD_COMPLETION" && q.wordTemplate) {
        const blanks = q.wordTemplate.split("").filter((ch) => ch === "_");
        setWordBlanks(new Array(blanks.length).fill(""));
      }

      setPhase("QUESTION");
    });

    socket.on("game:timer", ({ remaining }) => setRemaining(remaining));

    socket.on("game:reveal", (data) => {
      setReveal(data);
      const myResult = data.playerResults.find((r) => r.playerId === playerId);
      if (myResult) {
        setMyScore(myResult.totalScore);
        playSound(myResult.wasCorrect ? "correct" : "wrong");
      }
      setPhase("REVEAL");
    });

    socket.on("game:leaderboard", ({ players }) => {
      const idx = players.findIndex((p) => p.id === playerId);
      if (idx >= 0) {
        setMyRank(idx + 1);
        setMyScore(players[idx].score);
      }
    });

    socket.on("game:finished", ({ players }) => {
      playSound("finish");
      setFinalRanking(players);
      setPhase("FINISHED");
    });

    return () => {
      socket.off("lobby:started");
      socket.off("game:question");
      socket.off("game:timer");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("game:finished");
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

  // === RENDER ===

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
      reveal.questionType === "OPEN_ANSWER" || reveal.questionType === "IMAGE_GUESS";

    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-slide-up">
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
              </div>
              {myRank && (
                <div>
                  <p className="text-muted text-sm">Posizione</p>
                  <p className="text-3xl font-bold">#{myRank}</p>
                </div>
              )}
            </div>
          </div>
          <p className="text-muted text-sm">In attesa della prossima domanda...</p>
        </div>
      </main>
    );
  }

  if (phase === "ANSWERED") {
    const isOpenType =
      question?.questionType === "OPEN_ANSWER" ||
      question?.questionType === "IMAGE_GUESS";
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse-slow">⏳</div>
          <h2 className="text-xl font-bold mb-2">Risposta inviata</h2>
          <p className="text-muted">
            {isOpenType
              ? "In attesa che l'admin giudichi..."
              : "In attesa degli altri giocatori..."}
          </p>
          <div className="mt-6 text-4xl font-bold tabular-nums">{remaining}</div>
        </div>
      </main>
    );
  }

  if (phase === "QUESTION" && question) {
    // --- MULTIPLE CHOICE ---
    if (question.questionType === "MULTIPLE_CHOICE") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">{remaining}</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${(remaining / question.timeLimit) * 100}%` }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
            {question.answers.map((a, i) => (
              <button
                key={a.id}
                onClick={() => submitMultipleChoice(a.id)}
                disabled={!!selectedAnswerId}
                className={`answer-tile ${answerColors[i]} ${selectedAnswerId === a.id ? "ring-4 ring-white" : ""}`}
              >
                <span className="font-bold text-2xl mr-3">{String.fromCharCode(65 + i)}</span>
                <span>{a.text}</span>
              </button>
            ))}
          </div>
        </main>
      );
    }

    // --- OPEN ANSWER ---
    if (question.questionType === "OPEN_ANSWER") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">{remaining}</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${(remaining / question.timeLimit) * 100}%` }}
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
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">{remaining}</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${(remaining / question.timeLimit) * 100}%` }}
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
        </main>
      );
    }

    // --- IMAGE GUESS ---
    if (question.questionType === "IMAGE_GUESS") {
      return (
        <main className="min-h-screen p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {question.questionNumber} / {question.totalQuestions}
            </span>
            <span className="text-2xl font-bold tabular-nums text-accent">{remaining}</span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${(remaining / question.timeLimit) * 100}%` }}
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
          </div>
        </main>
      );
    }
  }

  // WAITING
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        {myAvatarUrl ? (
          <img src={myAvatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-accent mx-auto mb-4" />
        ) : (
          <div className="text-7xl mb-4">{myEmoji}</div>
        )}
        <h2 className="text-2xl font-bold mb-2">Ciao {nickname}!</h2>
        <p className="text-muted">In attesa dell&apos;host...</p>
        {!isConnected && (
          <p className="text-warning text-sm mt-4">Riconnessione...</p>
        )}
      </div>
    </main>
  );
}
