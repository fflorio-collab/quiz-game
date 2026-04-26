"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default function QrPage() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const adminUrl = origin ? `${origin}/admin` : "";
  const playerUrl = origin ? `${origin}/player` : "";

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <Link href="/" className="apple-link text-sm inline-flex mb-4">
              ‹ Home
            </Link>
            <p className="chip-gold mb-2 inline-flex">Accesso rapido</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">QR Code.</h1>
            <p className="text-muted mt-2">Stampa, proietta, condividi.</p>
          </div>
          <button onClick={() => window.print()} className="btn-secondary">
            Stampa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Admin QR */}
          <div className="card flex flex-col items-center gap-6 py-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl">
                🔐
              </div>
              <div>
                <h2 className="text-xl font-bold">Area Admin</h2>
                <p className="text-muted text-sm">Solo per amministratori</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg">
              {adminUrl ? (
                <QRCodeSVG value={adminUrl} size={220} level="M" />
              ) : (
                <div className="w-[220px] h-[220px] bg-gray-100 rounded animate-pulse" />
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted">Scansiona per accedere al pannello admin</p>
              {adminUrl && (
                <p className="text-xs font-mono text-muted/70 break-all">{adminUrl}</p>
              )}
              <Link
                href="/admin"
                className="inline-block mt-2 text-sm text-accent hover:underline"
              >
                Vai all&apos;area admin →
              </Link>
            </div>
          </div>

          {/* Player QR */}
          <div className="card flex flex-col items-center gap-6 py-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-2xl">
                🎮
              </div>
              <div>
                <h2 className="text-xl font-bold">Area Giocatori</h2>
                <p className="text-muted text-sm">Per tutti i partecipanti</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg">
              {playerUrl ? (
                <QRCodeSVG value={playerUrl} size={220} level="M" />
              ) : (
                <div className="w-[220px] h-[220px] bg-gray-100 rounded animate-pulse" />
              )}
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted">Scansiona per entrare nella partita</p>
              {playerUrl && (
                <p className="text-xs font-mono text-muted/70 break-all">{playerUrl}</p>
              )}
              <Link
                href="/player"
                className="inline-block mt-2 text-sm text-accent hover:underline"
              >
                Vai all&apos;area giocatori →
              </Link>
            </div>
          </div>
        </div>

        {/* Print styles */}
        <style jsx global>{`
          @media print {
            nav, button, a { display: none !important; }
            .card { border: 2px solid #ccc !important; }
          }
        `}</style>
      </div>
    </main>
  );
}
