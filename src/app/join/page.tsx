"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/useSocket";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-compila il codice se passato come query param (?code=XXXXXX)
  useEffect(() => {
    const paramCode = searchParams.get("code");
    if (paramCode) setCode(paramCode.toUpperCase());
  }, [searchParams]);

  const joinGame = () => {
    if (!socket) return;
    if (!code.trim() || code.length !== 6) {
      setError("Il codice deve essere di 6 caratteri");
      return;
    }
    if (!nickname.trim()) {
      setError("Inserisci il tuo nickname");
      return;
    }

    setLoading(true);
    setError("");

    socket.emit(
      "player:join",
      { code: code.trim().toUpperCase(), nickname: nickname.trim() },
      (res) => {
        setLoading(false);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        sessionStorage.setItem("playerId", res.playerId);
        sessionStorage.setItem("playerGameId", res.gameId);
        sessionStorage.setItem("playerNickname", nickname.trim());
        router.push(`/play/${res.gameId}`);
      }
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-muted hover:text-white text-sm mb-6 inline-block"
        >
          ← Home
        </Link>

        <div className="card animate-slide-up">
          <h1 className="text-3xl font-bold mb-2">Entra nella partita</h1>
          <p className="text-muted mb-6">
            Inserisci il codice ricevuto dall&apos;host e scegli un nickname.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Codice partita
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="ABCD12"
                className="input text-center text-3xl font-mono tracking-widest uppercase"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Il tuo nome"
                className="input"
                maxLength={20}
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={joinGame}
              disabled={loading || !isConnected}
              className="btn-primary w-full"
            >
              {loading
                ? "Accesso..."
                : !isConnected
                  ? "Connessione al server..."
                  : "Entra"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
