"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-compila il codice se passato come query param (?code=XXXXXX)
  useEffect(() => {
    const paramCode = searchParams.get("code");
    if (paramCode) setCode(paramCode.toUpperCase());
  }, [searchParams]);

  // Migration vercel-pusher fase 7.6: POST /api/player al posto di socket.emit("player:join").
  const joinGame = async () => {
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
    try {
      const r = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          nickname: nickname.trim(),
        }),
      });
      const res = await r.json();
      if (!r.ok) { setError(res.error || "Errore"); setLoading(false); return; }
      localStorage.setItem("playerId", res.playerId);
      localStorage.setItem("playerGameId", res.gameId);
      localStorage.setItem("playerGameCode", code.trim().toUpperCase());
      localStorage.setItem("playerNickname", nickname.trim());
      router.push(`/play/${res.gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di rete");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="apple-link text-sm mb-6 inline-flex">
          ‹ Home
        </Link>

        <div className="card">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Entra nella partita.</h1>
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
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Accesso..." : "Entra"}
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
