"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/useSocket";

function SpectatorEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const paramCode = searchParams.get("code");
    if (paramCode) setCode(paramCode.toUpperCase());
  }, [searchParams]);

  const follow = () => {
    if (!socket) return;
    if (!code.trim() || code.length !== 6) {
      setError("Il codice deve essere di 6 caratteri");
      return;
    }
    setLoading(true);
    setError("");
    socket.emit("spectator:join", { code: code.trim().toUpperCase() }, (res) => {
      setLoading(false);
      if (!res.success) { setError(res.error); return; }
      localStorage.setItem("spectatorGameId", res.gameId);
      localStorage.setItem("spectatorCode", code.trim().toUpperCase());
      router.push(`/spectator/${res.gameId}`);
    });
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
              disabled={loading || !isConnected}
              className="btn-primary w-full"
            >
              {loading ? "Connessione..." : !isConnected ? "Connessione al server..." : "Segui la partita"}
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
