"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useSocket } from "@/lib/useSocket";
import type { QuestionType } from "@/types/socket";

const MODES: { type: QuestionType; label: string; desc: string; icon: string }[] = [
  {
    type: "MULTIPLE_CHOICE",
    label: "Risposta multipla",
    desc: "4 opzioni, una sola corretta",
    icon: "🔤",
  },
  {
    type: "OPEN_ANSWER",
    label: "Risposta aperta",
    desc: "L'admin giudica le risposte",
    icon: "✏️",
  },
  {
    type: "WORD_COMPLETION",
    label: "Componi la parola",
    desc: "Lettere mancanti da completare",
    icon: "🔡",
  },
  {
    type: "IMAGE_GUESS",
    label: "Indovina il luogo",
    desc: "Guarda l'immagine e rispondi",
    icon: "🗺️",
  },
];

export default function HostPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [hostName, setHostName] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [questionType, setQuestionType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createGame = () => {
    if (!socket) return;
    if (!hostName.trim()) {
      setError("Inserisci il tuo nome");
      return;
    }
    setLoading(true);
    setError("");

    socket.emit(
      "host:create",
      { hostName: hostName.trim(), difficulty, totalQuestions, questionType },
      (res) => {
        setLoading(false);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        sessionStorage.setItem("hostGameId", res.gameId);
        sessionStorage.setItem("hostCode", res.code);
        router.push(`/host/${res.gameId}`);
      }
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="text-muted hover:text-white text-sm mb-6 inline-block">
          ← Home
        </Link>

        <div className="card animate-slide-up">
          <h1 className="text-3xl font-bold mb-2">Nuova partita</h1>
          <p className="text-muted mb-6">
            Configura la partita e otterrai un codice da condividere.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Il tuo nome</label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Es. Marco"
                className="input"
                maxLength={20}
              />
            </div>

            {/* Modalità di gioco */}
            <div>
              <label className="block text-sm font-medium mb-2">Modalità di gioco</label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.type}
                    onClick={() => setQuestionType(m.type)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      questionType === m.type
                        ? "border-accent bg-accent/10 text-white"
                        : "border-border text-muted hover:border-muted"
                    }`}
                  >
                    <div className="text-xl mb-1">{m.icon}</div>
                    <div className="font-medium text-sm leading-tight">{m.label}</div>
                    <div className="text-xs text-muted mt-0.5 leading-tight">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Difficoltà</label>
              <div className="grid grid-cols-3 gap-2">
                {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                      difficulty === d
                        ? "border-accent bg-accent/10 text-white"
                        : "border-border text-muted hover:border-muted"
                    }`}
                  >
                    {d === "EASY" ? "Facile" : d === "MEDIUM" ? "Medio" : "Difficile"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Numero domande: {totalQuestions}
              </label>
              <input
                type="range"
                min={5}
                max={20}
                step={1}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>5</span>
                <span>20</span>
              </div>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={createGame}
              disabled={loading || !isConnected}
              className="btn-primary w-full"
            >
              {loading
                ? "Creazione..."
                : !isConnected
                  ? "Connessione al server..."
                  : "Crea partita"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
