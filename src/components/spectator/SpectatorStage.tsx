"use client";

// Orchestratore della vista TV spettatore (sola lettura, nessuna interazione).
//
// Fonti di stato:
//   • useSnapshot(spectator)  → recovery da refresh + stato autorevole di ogni fase
//   • useGameChannel(gameId)  → eventi realtime: ad ogni evento rilevante refetch
//     dello snapshot (semplice e robusto per un display live), tranne il contatore
//     risposte che si aggiorna localmente da "game:answer-received".
//   • useGameTick(gameId)     → countdown fluido del timer domanda.
//
// Routing delle fasi (priorità): FINISHED → LOBBY → reveal → domanda →
//   scegli categoria → jeopardy → giudizio/attesa.

import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "@/hooks/useSnapshot";
import { useGameChannel } from "@/hooks/useGameChannel";
import { useGameTick } from "@/hooks/useGameTick";
import { useSound } from "@/hooks/useSound";
import { Logo, Spinner } from "@/components/ui";
import { StageLayout } from "./StageLayout";
import { Standings } from "./Standings";
import { LobbyView } from "./LobbyView";
import { QuestionView } from "./QuestionView";
import { RevealView } from "./RevealView";
import { CategoryPickView } from "./CategoryPickView";
import { JeopardyView } from "./JeopardyView";
import { FinishedView } from "./FinishedView";
import { Interstitial } from "./shared";

export interface SpectatorStageProps {
  gameId: string;
}

export function SpectatorStage({ gameId }: SpectatorStageProps) {
  const { snapshot, loading, error, refetch } = useSnapshot({ role: "spectator", gameId });
  const { play } = useSound();

  // URL assoluto per il QR verso /play (disponibile solo dopo il mount).
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Contatore "hanno risposto": id ricevuti via game:answer-received, azzerato
  // ad ogni cambio di domanda.
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const currentGqId = snapshot?.currentQuestion?.gameQuestionId ?? null;
  useEffect(() => {
    setAnswered(new Set());
  }, [currentGqId]);

  // Evita di reagire agli eventi prima che il primo snapshot sia arrivato.
  const readyRef = useRef(false);
  readyRef.current = snapshot !== null;

  useGameChannel(gameId, {
    onEvent: (event, data) => {
      switch (event) {
        case "game:answer-received":
          setAnswered((prev) => {
            const next = new Set(prev);
            next.add((data as { playerId: string }).playerId);
            return next;
          });
          break;
        case "game:question":
          play("start");
          void refetch();
          break;
        case "game:reveal":
          play("correct");
          void refetch();
          break;
        case "game:finished":
          play("finish");
          void refetch();
          break;
        case "player:joined":
          play("join");
          void refetch();
          break;
        case "lobby:updated":
        case "lobby:started":
        case "game:leaderboard":
        case "game:category-grid":
        case "game:jeopardy-grid":
        case "game:turn":
        case "game:local-state":
        case "error":
          void refetch();
          break;
        default:
          break;
      }
    },
  });

  const tick = useGameTick(gameId, {
    intervalMs: 2000,
    enabled: snapshot?.gameStatus === "PLAYING",
  });

  // ── Stati di bordo ──────────────────────────────────────────────────────
  if (!snapshot) {
    if (loading) {
      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 text-center">
          <Logo size="lg" />
          <Spinner size="lg" />
          <p className="text-muted">Collegamento al palco…</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size="lg" />
        <h1 className="tv-title text-3xl">Partita non trovata</h1>
        <p className="text-muted">{error ?? "Controlla il codice e riprova."}</p>
        <a href="/spectator" className="btn-secondary">
          Torna all&apos;ingresso
        </a>
      </div>
    );
  }

  const code = snapshot.code;

  // FINISHED — podio a tutta larghezza
  if (snapshot.gameStatus === "FINISHED") {
    return (
      <StageLayout code={code}>
        <FinishedView ranking={snapshot.finalRanking ?? snapshot.players} />
      </StageLayout>
    );
  }

  // LOBBY — codice gigante + QR + giocatori, a tutta larghezza
  if (snapshot.gameStatus === "LOBBY") {
    return (
      <StageLayout code={code}>
        <LobbyView
          code={code}
          players={snapshot.players}
          joinUrl={origin ? `${origin}/play?code=${code}` : ""}
        />
      </StageLayout>
    );
  }

  // PLAYING — contenuto principale + classifica laterale
  const highlightIds =
    snapshot.isRevealing && snapshot.reveal
      ? new Set(snapshot.reveal.playerResults.filter((r) => r.wasCorrect).map((r) => r.playerId))
      : undefined;

  let main;
  if (snapshot.isRevealing && snapshot.reveal) {
    main = <RevealView reveal={snapshot.reveal} />;
  } else if (snapshot.currentQuestion) {
    main = (
      <QuestionView
        question={snapshot.currentQuestion}
        remaining={tick.remaining ?? snapshot.remainingTime ?? null}
        answeredCount={answered.size}
        totalPlayers={snapshot.players.length}
      />
    );
  } else if (snapshot.categoryGrid) {
    main = <CategoryPickView grid={snapshot.categoryGrid} />;
  } else if (snapshot.jeopardyGrid) {
    main = <JeopardyView grid={snapshot.jeopardyGrid} />;
  } else if (snapshot.judging) {
    main = (
      <Interstitial
        icon="🧑‍⚖️"
        title="Verifica risposte"
        subtitle="Il conduttore sta validando le risposte aperte…"
      />
    );
  } else {
    main = (
      <Interstitial
        title="Un attimo…"
        subtitle="Preparazione della prossima domanda"
      />
    );
  }

  return (
    <StageLayout code={code} aside={<Standings players={snapshot.players} highlightIds={highlightIds} />}>
      {main}
    </StageLayout>
  );
}

export default SpectatorStage;
