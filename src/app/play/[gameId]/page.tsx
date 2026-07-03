"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PlayerInfo, QuestionData, RevealData } from "@/types/game";
import { useGameChannel, type GameEventHandlers } from "@/hooks/useGameChannel";
import { useSnapshot } from "@/hooks/useSnapshot";
import { useGameTick } from "@/hooks/useGameTick";
import { useSound } from "@/hooks/useSound";
import { Spinner } from "@/components/ui";
import {
  WaitingView,
  QuestionView,
  AnsweredView,
  RevealView,
  NotMyTurnView,
  PodiumView,
  RoundIntroView,
  useLocalIdentity,
} from "@/components/player";

type RoundIntro = NonNullable<RevealData["nextRound"]>;

export default function PlayGamePage() {
  const routeParams = useParams<{ gameId: string }>();
  const gameId = String(routeParams?.gameId ?? "");
  const router = useRouter();

  const { identity, ready } = useLocalIdentity();
  const myId = identity.playerId;
  const { play, enabled: soundEnabled, toggle: toggleSound } = useSound();

  // ── Stato di gioco (seed da snapshot, poi mutato dagli eventi realtime) ──
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answered, setAnswered] = useState(false);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [ranking, setRanking] = useState<PlayerInfo[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState<"LOBBY" | "PLAYING" | "FINISHED" | null>(null);
  const [roundIntro, setRoundIntro] = useState<RoundIntro | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const appliedRef = useRef(false);
  const pendingRoundIntroRef = useRef<RoundIntro | null>(null);
  const questionShownAtRef = useRef<number>(Date.now());
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const markApplied = () => {
    appliedRef.current = true;
  };

  // Nessuna identità → torna alla join.
  useEffect(() => {
    if (ready && !myId) router.replace("/play");
  }, [ready, myId, router]);

  // ── Snapshot (recovery da refresh) ──
  const { snapshot, loading, error, refetch } = useSnapshot(
    ready && myId && gameId ? { role: "player", gameId, playerId: myId } : null,
  );

  useEffect(() => {
    if (!snapshot || appliedRef.current) return;
    appliedRef.current = true;
    setStatus(snapshot.gameStatus);
    setPlayers(snapshot.players ?? []);
    if (snapshot.gameStatus === "FINISHED") {
      setFinished(true);
      setRanking(snapshot.finalRanking ?? snapshot.players ?? []);
      return;
    }
    if (snapshot.reveal) {
      setReveal(snapshot.reveal);
      if (snapshot.reveal.nextRound) pendingRoundIntroRef.current = snapshot.reveal.nextRound;
      return;
    }
    if (snapshot.currentQuestion) {
      setQuestion(snapshot.currentQuestion);
      setAnswered(!!snapshot.alreadyAnswered);
      questionShownAtRef.current = Date.now();
    }
  }, [snapshot]);

  // ── Timer (countdown + auto-fine domanda lato server) ──
  const tick = useGameTick(gameId, { intervalMs: 2000, enabled: !!gameId });

  // Sincronizza lo stato partita col tick (rete d'emergenza per LOBBY→PLAYING→FINISHED).
  useEffect(() => {
    if (tick.status && tick.status !== status) setStatus(tick.status);
    if (tick.status === "FINISHED" && !finished) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick.status]);

  // ── Transizioni da eventi ──
  const onQuestion = (q: QuestionData) => {
    markApplied();
    setReveal(null);
    setFinished(false);
    setStatus("PLAYING");
    const pending = pendingRoundIntroRef.current;
    if (pending) {
      pendingRoundIntroRef.current = null;
      setRoundIntro(pending);
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      introTimerRef.current = setTimeout(() => setRoundIntro(null), 2600);
    }
    setQuestion(q);
    setAnswered(false);
    lastTickRef.current = null;
    questionShownAtRef.current = Date.now();
  };

  const onReveal = (r: RevealData) => {
    markApplied();
    setRoundIntro(null);
    setReveal(r);
    setQuestion(null);
    if (r.nextRound) pendingRoundIntroRef.current = r.nextRound;
    const mine = r.playerResults.find((p) => p.playerId === myId);
    if (mine) play(mine.wasCorrect ? "correct" : "wrong");
  };

  const handlers: GameEventHandlers = {
    "lobby:updated": (d) => {
      markApplied();
      setPlayers(d.players);
    },
    "player:joined": (d) => {
      setPlayers((prev) => (prev.some((p) => p.id === d.player.id) ? prev : [...prev, d.player]));
    },
    "lobby:started": () => {
      markApplied();
      setStatus("PLAYING");
    },
    "game:question": (q) => onQuestion(q),
    "game:turn": (t) => {
      setQuestion((prev) =>
        prev && prev.gameQuestionId === t.gameQuestionId
          ? { ...prev, turnPlayerId: t.turnPlayerId, turnPlayerNickname: t.turnPlayerNickname }
          : prev,
      );
    },
    "game:answer-received": (d) => {
      if (d.playerId === myId) setAnswered(true);
    },
    "game:reveal": (r) => onReveal(r),
    "game:leaderboard": (d) => setPlayers(d.players),
    "game:finished": (d) => {
      markApplied();
      setFinished(true);
      setRanking(d.players);
      setReveal(null);
      setQuestion(null);
      play("finish");
    },
  };

  useGameChannel(gameId, { handlers });

  // Suono tick negli ultimi 5 secondi (solo se posso ancora rispondere).
  const turnBased = question?.turnPlayerId != null;
  const isMyTurn = !turnBased || question?.turnPlayerId === myId;
  const canAnswer = !!question && !reveal && !answered && isMyTurn && !finished;

  useEffect(() => {
    const r = tick.remaining;
    if (!canAnswer || r === null || r <= 0 || r > 5) return;
    if (lastTickRef.current === r) return;
    lastTickRef.current = r;
    play("tick");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick.remaining, canAnswer]);

  // Pulizia timer intro.
  useEffect(() => () => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
  }, []);

  // ── Invio risposta ──
  const onAnswer = async (payload: { answerId?: string; answerText?: string }) => {
    if (!myId || !question || submitting || answered) return;
    setSubmitting(true);
    setAnswered(true); // ottimistico → passa subito ad AnsweredView
    const timeTaken = Date.now() - questionShownAtRef.current;
    try {
      const res = await fetch(`/api/player/${myId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, ...payload, timeTaken }),
      });
      // 409 = "hai già risposto" → tieni AnsweredView. Altri errori (es. 403 non è
      // il tuo turno) → torna indietro così la UI mostra lo stato corretto.
      if (!res.ok && res.status !== 409) setAnswered(false);
    } catch {
      setAnswered(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────── Render ───────────────────────────

  if (!ready || !myId) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Snapshot fallito senza alcuno stato utile → probabilmente non sei in questa
  // partita (identità vecchia). Proponi il rientro.
  const noState = !question && !reveal && !finished && status === null;
  if (!loading && error && noState) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="text-6xl">📵</div>
        <h1 className="font-display text-2xl uppercase text-white">Non sei in questa partita</h1>
        <p className="max-w-xs text-muted">La sessione è scaduta o la partita non esiste più.</p>
        <a
          href={`/play${identity.playerGameCode ? `?code=${identity.playerGameCode}` : ""}`}
          className="btn-primary min-h-[64px] px-8 text-lg"
        >
          Rientra
        </a>
      </div>
    );
  }

  if (finished) {
    return <PodiumView ranking={ranking ?? players} myId={myId} />;
  }

  if (roundIntro) {
    return <RoundIntroView nextRound={roundIntro} />;
  }

  if (reveal) {
    return <RevealView reveal={reveal} myId={myId} players={players} />;
  }

  if (question) {
    if (answered) {
      return (
        <AnsweredView
          question={question}
          nickname={identity.playerNickname ?? "Tu"}
          emoji={identity.playerEmoji}
        />
      );
    }
    if (!isMyTurn) {
      return <NotMyTurnView question={question} remaining={tick.remaining} />;
    }
    return (
      <QuestionView
        question={question}
        remaining={tick.remaining}
        canAnswer={canAnswer}
        submitting={submitting}
        onAnswer={onAnswer}
      />
    );
  }

  // Default: lobby / attesa della prossima domanda.
  if (loading && noState) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <WaitingView
      nickname={identity.playerNickname ?? "Tu"}
      emoji={identity.playerEmoji}
      code={identity.playerGameCode}
      playersCount={players.length}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
    />
  );
}
