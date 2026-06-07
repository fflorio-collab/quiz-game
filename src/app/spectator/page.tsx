"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";

function SpectatorEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const paramCode = searchParams.get("code");
    if (paramCode) setCode(paramCode.toUpperCase());
  }, [searchParams]);

  // Migration vercel-pusher fase 7.6: POST /api/spectator invece di socket.emit("spectator:join").
  const follow = async () => {
    if (!code.trim() || code.length !== 6) {
      setError("Il codice deve essere di 6 caratteri");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/spectator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const res = await r.json();
      if (!r.ok) { setError(res.error || "Errore"); setLoading(false); return; }
      localStorage.setItem("spectatorGameId", res.gameId);
      localStorage.setItem("spectatorCode", code.trim().toUpperCase());
      router.push(`/spectator/${res.gameId}`);
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
          <div className="chip-gold mb-3">Spettatore</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Segui la partita.</h1>
          <p className="text-muted mb-6">
            Inserisci il codice per vedere la sfida in diretta. Domande, timer e classifica,
            senza spoiler sulla risposta.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Codice partita</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCD12"
                className="input text-center text-3xl font-mono tracking-widest uppercase"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                onKeyDown={(e) => { if (e.key === "Enter") follow(); }}
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={follow}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Connessione..." : "Segui la partita"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SpectatorCodePage() {
  return (
    <Suspense>
      <SpectatorEntry />
    </Suspense>
  );
}
