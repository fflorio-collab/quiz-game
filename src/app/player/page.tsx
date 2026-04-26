"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useSocket } from "@/lib/useSocket";

const EMOJIS = [
  "😀","😎","🦊","🐱","🐶","🦄","🦁","🐸",
  "🤖","👻","🎃","⚡","🔥","💫","🌟","🎮",
  "🏆","🦸","🥷","🧙","🤡","🦅","🦋","🌈",
  "🍕","🎵","🎯","🎲","🚀","🐉",
];

function PlayerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();

  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("😀");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const paramCode = searchParams.get("code");
    if (paramCode) setCode(paramCode.toUpperCase());
    setPageUrl(window.location.origin + "/player");
  }, [searchParams]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview
    setAvatarPreview(URL.createObjectURL(file));
    // Upload
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Errore upload");
      setAvatarPreview(null);
      return;
    }
    const data = await res.json();
    setAvatarUrl(data.url);
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const joinGame = () => {
    if (!socket) return;
    if (!code.trim() || code.length !== 6) { setError("Il codice deve essere di 6 caratteri"); return; }
    if (!nickname.trim()) { setError("Inserisci il tuo nickname"); return; }
    setLoading(true);
    setError("");
    socket.emit(
      "player:join",
      { code: code.trim().toUpperCase(), nickname: nickname.trim(), emoji: selectedEmoji, avatarUrl: avatarUrl ?? undefined },
      (res) => {
        setLoading(false);
        if ("error" in res) { setError(res.error); return; }
        localStorage.setItem("playerId", res.playerId);
        localStorage.setItem("playerGameId", res.gameId);
        localStorage.setItem("playerGameCode", code.trim().toUpperCase());
        localStorage.setItem("playerNickname", nickname.trim());
        localStorage.setItem("playerEmoji", selectedEmoji);
        if (avatarUrl) localStorage.setItem("playerAvatarUrl", avatarUrl);
        else localStorage.removeItem("playerAvatarUrl");
        router.push(`/play/${res.gameId}`);
      }
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="chip-gold mb-4 inline-flex">Giocatore</div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-2">Entra in scena.</h1>
          <p className="text-muted">Scegli il tuo look e sali sul palco della serata.</p>
        </div>

        <div className="card animate-slide-up space-y-6">
          {/* Avatar + emoji preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-full border border-white/10 hover:border-accent transition-colors overflow-hidden flex items-center justify-center bg-surface"
                title="Carica foto"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">{selectedEmoji}</span>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
              {/* Camera badge */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm border-2 border-background hover:bg-accent-hover transition-colors"
                title="Carica foto"
              >
                📷
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-danger flex items-center justify-center text-xs border-2 border-background"
                  title="Rimuovi foto"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-xs text-muted">
              {avatarPreview ? "Tocca ✕ per rimuovere la foto" : "Tocca 📷 per aggiungere una foto"}
            </p>
          </div>

          {/* Emoji picker */}
          <div>
            <p className="text-sm font-medium mb-2">Scegli il tuo emoji</p>
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedEmoji(em)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedEmoji === em
                      ? "bg-accent/20 ring-2 ring-accent scale-110"
                      : "hover:bg-white/5 ring-2 ring-transparent"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
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

          {/* Codice partita */}
          <div>
            <label className="block text-sm font-medium mb-2">Codice partita</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && joinGame()}
              placeholder="ABCD12"
              className="input text-center text-3xl font-mono tracking-widest uppercase"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={joinGame}
            disabled={loading || !isConnected || uploading}
            className="btn-primary w-full text-lg py-4"
          >
            {loading ? "Accesso in corso..." : !isConnected ? "Connessione..." : "🎯 Entra in scena"}
          </button>
        </div>

        {/* QR Code */}
        <div className="mt-4">
          <button onClick={() => setShowQr(!showQr)} className="w-full btn-secondary text-sm">
            {showQr ? "Nascondi" : "Mostra"} QR Code pagina giocatori
          </button>
          {showQr && pageUrl && (
            <div className="card mt-3 flex flex-col items-center gap-3 animate-slide-up">
              <p className="text-sm text-muted text-center">Scansiona per accedere direttamente</p>
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={pageUrl} size={180} level="M" />
              </div>
              <p className="text-xs text-muted font-mono break-all text-center">{pageUrl}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-white transition-colors">← Home</Link>
          <span>·</span>
          <Link href="/leaderboard" className="hover:text-white transition-colors">Classifica</Link>
        </div>
      </div>
    </main>
  );
}

export default function PlayerPage() {
  return (
    <Suspense>
      <PlayerContent />
    </Suspense>
  );
}
