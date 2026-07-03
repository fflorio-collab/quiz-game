"use client";

// Vista TV spettatore (schermo grande / proiettore). Sola lettura, nessuna
// interazione, nessuna identità: tutta la logica è in <SpectatorStage>.

import { useParams } from "next/navigation";
import { SpectatorStage } from "@/components/spectator/SpectatorStage";

export default function SpectatorGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  if (!gameId) return null;
  return <SpectatorStage gameId={gameId} />;
}
