"use client";

// Fase LOBBY sulla TV: codice GIGANTE + QR verso /play?code= per far entrare i
// giocatori dal telefono, e la lista di chi è già entrato.

import { QRCodeSVG } from "qrcode.react";
import type { PlayerInfo } from "@/types/game";
import { CodeBadge } from "@/components/ui";

export interface LobbyViewProps {
  code: string;
  players: PlayerInfo[];
  /** URL assoluto verso /play?code=CODE (vuoto finché non c'è window.origin) */
  joinUrl: string;
}

export function LobbyView({ code, players, joinUrl }: LobbyViewProps) {
  return (
    <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-2">
      {/* Colonna sinistra: come entrare */}
      <div className="flex flex-col items-center text-center">
        <span className="chip-gold mb-4">In attesa di giocatori</span>
        <p className="mb-2 text-sm uppercase tracking-[0.24em] text-muted">
          Inquadra il QR oppure vai su questo sito e inserisci il codice
        </p>

        <CodeBadge code={code} className="my-4" />

        {joinUrl && (
          <div className="mt-2 rounded-2xl bg-white p-4 shadow-glow">
            <QRCodeSVG value={joinUrl} size={200} level="M" includeMargin={false} />
          </div>
        )}
        <p className="mt-4 break-all text-sm text-muted">{joinUrl}</p>
      </div>

      {/* Colonna destra: giocatori entrati */}
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="tv-title text-3xl md:text-4xl">In sala</h2>
          <span className="font-display text-2xl tabular-nums text-gold">{players.length}</span>
        </div>

        {players.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center text-muted">
            Nessun giocatore ancora.<br />Sarai il primo?
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 animate-slide-up"
              >
                <span className="text-xl">{p.emoji ?? "🎮"}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{p.nickname}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LobbyView;
