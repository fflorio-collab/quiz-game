import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white to-accent bg-clip-text text-transparent">
            QuizGame
          </h1>
          <p className="mt-4 text-lg text-muted max-w-xl mx-auto">
            Sfida i tuoi amici in tempo reale. Crea una partita, condividi il
            codice, rispondete ognuno dal proprio dispositivo.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {/* Crea partita */}
          <Link
            href="/host"
            className="group card hover:border-accent transition-colors"
          >
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold mb-2">Crea partita</h2>
            <p className="text-muted mb-4">
              Diventa l&apos;host: scegli difficoltà e numero di domande.
              Otterrai un codice da condividere.
            </p>
            <span className="text-accent font-medium group-hover:underline">
              Inizia come host →
            </span>
          </Link>

          {/* Partecipa */}
          <Link
            href="/player"
            className="group card hover:border-accent transition-colors"
          >
            <div className="text-5xl mb-4">📱</div>
            <h2 className="text-2xl font-bold mb-2">Partecipa</h2>
            <p className="text-muted mb-4">
              Hai un codice? Inserisci il tuo nickname e rispondi alle domande
              dal tuo smartphone.
            </p>
            <span className="text-accent font-medium group-hover:underline">
              Entra nella partita →
            </span>
          </Link>
        </div>

        {/* Link secondari */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-muted">
          <Link href="/leaderboard" className="hover:text-white">
            🏆 Classifica globale
          </Link>
          <span>·</span>
          <Link href="/admin" className="hover:text-white">
            ⚙️ Area admin
          </Link>
          <span>·</span>
          <Link href="/qr" className="hover:text-white">
            📷 QR Code
          </Link>
        </div>
      </div>
    </main>
  );
}
