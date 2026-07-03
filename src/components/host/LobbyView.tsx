"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Chip, CodeBadge } from "@/components/ui";
import { hostPost, hostDelete } from "./hostFetch";
import type { PlayerInfo, PlayMode } from "@/types/game";

export interface LobbyViewProps {
  gameId: string;
  code: string;
  players: PlayerInfo[];
  playMode: PlayMode;
  localPartyMode: boolean;
  starting: boolean;
  onStart: () => void;
}

// Sala d'attesa da proiettore: codice gigante + QR, lista giocatori live, avvio.
// In modalità presentatore l'host aggiunge/rimuove i giocatori qui (niente device).
export function LobbyView({
  gameId,
  code,
  players,
  playMode,
  localPartyMode,
  starting,
  onStart,
}: LobbyViewProps) {
  const [origin, setOrigin] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const joinUrl = useMemo(
    () => (origin ? `${origin}/play?code=${code}` : `/play?code=${code}`),
    [origin, code],
  );

  async function addPlayer() {
    const nickname = newName.trim();
    if (!nickname) return;
    setBusy(true);
    setErr(null);
    const res = await hostPost(gameId, "/local-player", { nickname });
    setBusy(false);
    if (!res.ok) setErr(res.error ?? "Errore");
    else setNewName("");
  }

  async function removePlayer(playerId: string) {
    setErr(null);
    const res = await hostDelete(gameId, `/local-player/${playerId}`);
    if (!res.ok) setErr(res.error ?? "Errore");
  }

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-6xl grid-cols-1 items-center gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Codice + QR */}
      <div className="flex flex-col items-center text-center">
        <p className="mb-2 text-lg uppercase tracking-[0.3em] text-muted">
          {localPartyMode ? "Modalità presentatore" : "Entra col codice"}
        </p>
        <CodeBadge code={code} />
        {!localPartyMode && origin && (
          <div className="mt-6 rounded-3xl bg-white p-4 shadow-glow">
            <QRCodeSVG value={joinUrl} size={220} level="M" />
          </div>
        )}
        {!localPartyMode && (
          <p className="mt-4 max-w-md break-all text-sm text-muted">{joinUrl}</p>
        )}
      </div>

      {/* Giocatori + avvio */}
      <Card glow className="flex max-h-[80vh] flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">
            Giocatori
          </h2>
          <Chip tone="gold">{players.length}</Chip>
        </div>

        {localPartyMode && (
          <div className="mb-4 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Nome giocatore"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            />
            <Button onClick={addPlayer} loading={busy} disabled={!newName.trim()}>
              Aggiungi
            </Button>
          </div>
        )}
        {err && <p className="mb-3 text-sm text-lose">{err}</p>}

        <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
          {players.length === 0 ? (
            <p className="py-10 text-center text-muted">
              In attesa dei giocatori…
            </p>
          ) : (
            players.map((p, i) => (
              <div
                key={p.id}
                className="flex animate-slide-up items-center gap-3 rounded-2xl border border-line bg-stage px-4 py-3"
              >
                <span className="w-6 text-center font-display text-muted">{i + 1}</span>
                {p.emoji && <span className="text-2xl">{p.emoji}</span>}
                <span className="flex-1 truncate text-lg font-semibold text-white">
                  {p.nickname}
                </span>
                {localPartyMode && (
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="text-muted transition-colors hover:text-lose"
                    aria-label="Rimuovi"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-line pt-4">
          <p className="mb-3 text-center text-sm text-muted">
            {playMode === "TURN_BASED"
              ? "A turni · ordine sorteggiato all'avvio"
              : "Tutti contro tutti"}
          </p>
          <Button
            size="xl"
            className="w-full"
            onClick={onStart}
            loading={starting}
            disabled={players.length === 0}
          >
            {players.length === 0 ? "Servono giocatori" : "Avvia la partita"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default LobbyView;
