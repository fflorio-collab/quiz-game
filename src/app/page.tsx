"use client";

// Landing "Game show TV scuro". Nessun marketing/login/pricing: solo le tre
// azioni grandi (Conduci / Gioca / Guarda), un campo codice condiviso e
// l'eventuale banner "rientra" letto da localStorage.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Logo } from "@/components/ui";

type Resume =
  | { role: "host"; gameId: string }
  | { role: "player"; gameId: string }
  | null;

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [resume, setResume] = useState<Resume>(null);

  useEffect(() => {
    try {
      const host = localStorage.getItem("hostGameId");
      const player = localStorage.getItem("playerGameId");
      if (host) setResume({ role: "host", gameId: host });
      else if (player) setResume({ role: "player", gameId: player });
    } catch {
      /* localStorage non disponibile */
    }
  }, []);

  const codeQ = code.trim() ? `?code=${encodeURIComponent(code.trim().toUpperCase())}` : "";

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center gap-10 px-6 py-12">
      <Logo size="xl" className="text-center" />

      {resume && (
        <button
          onClick={() => router.push(resume.role === "host" ? "/host" : "/play")}
          className="w-full max-w-xl rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3 text-left transition-colors hover:bg-gold/15"
        >
          <span className="text-sm font-semibold text-gold">
            {resume.role === "host" ? "▶ Riprendi la regia" : "▶ Rientra in partita"}
          </span>
          <span className="ml-2 text-sm text-muted">Hai una sessione aperta — tocca per riprendere</span>
        </button>
      )}

      {/* Tre azioni grandi */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
        <a href="/host" className="btn-primary !py-8 flex-col text-xl">
          <span className="text-3xl">🎤</span>
          Conduci
        </a>
        <a href="/play" className="btn-secondary !py-8 flex-col text-xl">
          <span className="text-3xl">🎮</span>
          Gioca
        </a>
        <a href="/spectator" className="btn-secondary !py-8 flex-col text-xl">
          <span className="text-3xl">📺</span>
          Guarda
        </a>
      </div>

      {/* Codice + Gioca/Guarda */}
      <div className="w-full max-w-xl">
        <p className="mb-3 text-center text-sm uppercase tracking-[0.2em] text-muted">
          Hai un codice?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODICE"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={12}
            className="text-center font-display text-xl uppercase tracking-[0.3em] sm:text-left"
            aria-label="Codice partita"
          />
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => router.push(`/play${codeQ}`)}>
              Gioca
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => router.push(`/spectator${codeQ}`)}>
              Guarda
            </Button>
          </div>
        </div>
      </div>

      {/* Link discreti */}
      <div className="flex items-center gap-6 text-sm">
        <a href="/leaderboard" className="apple-link">
          🏆 Hall of Fame
        </a>
        <a href="/admin" className="text-muted/50 transition-colors hover:text-muted">
          admin
        </a>
      </div>
    </main>
  );
}
