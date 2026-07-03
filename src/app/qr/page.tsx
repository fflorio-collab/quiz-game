"use client";

// Pagina QR stampabili: uno verso /play (giocatori), uno verso /spectator
// (schermo). Bottone Stampa; in stampa restano solo i due QR su sfondo bianco.

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Logo } from "@/components/ui";

function QrCard({ title, subtitle, url }: { title: string; subtitle: string; url: string }) {
  return (
    <div className="qr-card flex flex-col items-center gap-4 rounded-3xl border border-line bg-panel p-8 text-center">
      <h2 className="tv-title text-3xl md:text-4xl">{title}</h2>
      <p className="text-muted">{subtitle}</p>
      <div className="rounded-2xl bg-white p-5">
        {url ? (
          <QRCodeSVG value={url} size={260} level="M" includeMargin={false} />
        ) : (
          <div className="h-[260px] w-[260px]" />
        )}
      </div>
      <p className="break-all text-sm text-muted">{url}</p>
    </div>
  );
}

export default function QrPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col items-center gap-4 text-center print:hidden">
        <Logo size="md" />
        <h1 className="tv-title text-4xl">QR da stampare</h1>
        <p className="text-muted">Appendi questi codici in sala: uno per giocare, uno per guardare.</p>
        <Button size="lg" onClick={() => window.print()}>
          🖨️ Stampa
        </Button>
      </header>

      <div className="qr-grid grid grid-cols-1 gap-6 sm:grid-cols-2">
        <QrCard
          title="Gioca"
          subtitle="Inquadra e sfida tutti dal telefono"
          url={origin ? `${origin}/play` : ""}
        />
        <QrCard
          title="Guarda"
          subtitle="Segui la partita sullo schermo"
          url={origin ? `${origin}/spectator` : ""}
        />
      </div>

      <div className="text-center print:hidden">
        <a href="/" className="apple-link">
          ← Torna alla home
        </a>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          html, body { background: #ffffff !important; }
          .qr-card {
            border: 1px solid #ddd !important;
            background: #ffffff !important;
            color: #000000 !important;
            break-inside: avoid;
          }
          .qr-card .tv-title { color: #000000 !important; text-shadow: none !important; }
          .qr-card .text-muted { color: #444 !important; }
          .qr-grid { gap: 2rem !important; }
        }
      `,
        }}
      />
    </main>
  );
}
