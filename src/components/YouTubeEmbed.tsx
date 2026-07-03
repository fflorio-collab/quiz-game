"use client";

import { useEffect, useRef, useState } from "react";

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&#/]+)/,
    /[?&]v=([^&#]+)/,
    /embed\/([^?&#/]+)/,
    /shorts\/([^?&#/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

interface Props {
  url: string;
  className?: string;
  /** Avvia in muto (utile per anteprima admin) */
  muted?: boolean;
  /** Nasconde il video e mostra solo una player bar audio */
  audioOnly?: boolean;
  /** Durata massima di riproduzione in secondi (null = intera). Vale per tutti i video. */
  maxDuration?: number | null;
}

export default function YouTubeEmbed({ url, className, muted = false, audioOnly = false, maxDuration = null }: Props) {
  const videoId = extractYouTubeId(url);
  const cap = maxDuration != null && maxDuration > 0 ? maxDuration : null;
  // "Enhanced" = serve controllo programmatico (player JS): solo-audio o cap durata.
  const enhanced = audioOnly || cap != null;

  if (!videoId) {
    return (
      <div className="text-danger text-sm p-3 bg-danger/10 rounded-lg">
        URL YouTube non valido — usa youtube.com/watch?v=... o youtu.be/...
      </div>
    );
  }

  if (enhanced) {
    return (
      <YouTubePlayer
        videoId={videoId}
        className={className}
        muted={muted}
        audioOnly={audioOnly}
        cap={cap}
      />
    );
  }

  return <SimpleEmbed videoId={videoId} className={className} muted={muted} />;
}

/* ============================================================================
 * SimpleEmbed: embed classico via iframe (video visibile, loop, no controlli).
 * Percorso invariato usato quando non serve cap durata né modalità solo-audio.
 * ========================================================================== */
function SimpleEmbed({ videoId, className, muted }: { videoId: string; className?: string; muted: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const params = new URLSearchParams({
    autoplay: "1",
    loop: "1",
    playlist: videoId, // necessario per il loop
    controls: "0",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3", // nessuna annotazione
    fs: "0", // no fullscreen button
    disablekb: "1",
    enablejsapi: "1",
    mute: muted ? "1" : "0",
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${params}`;

  useEffect(() => {
    if (muted) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendVolume = () => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [100] }),
        "*"
      );
    };

    // Invia dopo il caricamento + più tentativi: l'IFrame API impiega un po' ad essere pronta
    iframe.addEventListener("load", sendVolume);
    const t1 = setTimeout(sendVolume, 1500);
    const t2 = setTimeout(sendVolume, 3500);

    return () => {
      iframe.removeEventListener("load", sendVolume);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [videoId, muted]);

  return (
    <iframe
      ref={iframeRef}
      src={embedUrl}
      className={className}
      allow="autoplay; fullscreen"
      allowFullScreen={false}
      frameBorder="0"
      title="YouTube"
    />
  );
}

/* ============================================================================
 * YouTubePlayer: usa la IFrame Player API (window.YT) per il controllo
 * programmatico necessario a:
 *  - cap di durata: ferma la riproduzione dopo `cap` secondi (no loop);
 *  - solo-audio: nasconde il video e mostra una player bar (play/pausa + seek).
 * ========================================================================== */

type YTPlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (v: number) => void;
  unMute: () => void;
};

type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Carica lo script IFrame API una sola volta per pagina e risolve quando è pronto.
let ytApiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<YTNamespace>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
    };
    if (!document.querySelector("script[data-yt-iframe-api]")) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.setAttribute("data-yt-iframe-api", "1");
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function YouTubePlayer({
  videoId,
  className,
  muted,
  audioOnly,
  cap,
}: {
  videoId: string;
  className?: string;
  muted: boolean;
  audioOnly: boolean;
  cap: number | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // Lunghezza effettiva mostrata/limitata: il minore tra cap e durata reale.
  const total = cap ? (duration > 0 ? Math.min(cap, duration) : cap) : duration;

  // Crea/distrugge il player. Il nodo gestito da YT è un figlio creato a mano,
  // così React non tocca mai l'iframe che la API sostituisce (compat StrictMode).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const host = document.createElement("div");
    wrap.appendChild(host);
    let destroyed = false;

    loadYouTubeApi().then((YT) => {
      if (destroyed) return;
      const player = new YT.Player(host, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          loop: cap ? 0 : 1, // con cap non si va in loop
          playlist: cap ? undefined : videoId,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          mute: muted ? 1 : 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (!muted) {
              e.target.unMute();
              e.target.setVolume(100);
            }
            setDuration(e.target.getDuration() || 0);
            setReady(true);
          },
          onStateChange: (e: { target: YTPlayer; data: number }) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            const d = e.target.getDuration() || 0;
            if (d) setDuration(d);
          },
        },
      });
      playerRef.current = player;
    });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* il player potrebbe non essere ancora pronto */
      }
      playerRef.current = null;
      setReady(false);
      setPlaying(false);
      setCurrent(0);
      setDuration(0);
      wrap.innerHTML = "";
    };
  }, [videoId, muted, cap]);

  // Aggiorna l'avanzamento e applica il cap di durata.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getCurrentTime() || 0;
      if (cap && t >= cap) {
        p.pauseVideo();
        p.seekTo(cap, true);
        setCurrent(cap);
        return;
      }
      setCurrent(t);
    }, 250);
    return () => window.clearInterval(id);
  }, [ready, cap]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) {
      p.pauseVideo();
      return;
    }
    // Se siamo a fine cap, ricomincia da capo.
    if (cap && current >= cap - 0.3) p.seekTo(0, true);
    p.playVideo();
  };

  const onSeek = (v: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(v, true);
    setCurrent(v);
  };

  // Solo cap durata, video visibile: stesso aspetto dell'embed classico.
  if (!audioOnly) {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`}>
        <div
          ref={wrapRef}
          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full"
        />
      </div>
    );
  }

  // Solo-audio: player nascosto (ma renderizzato, così l'audio gira) + player bar.
  return (
    <div className={`relative flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 ${className ?? ""}`}>
      <div
        ref={wrapRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 [&>iframe]:h-full [&>iframe]:w-full"
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pausa" : "Play"}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        disabled={!ready}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <input
        type="range"
        min={0}
        max={total || 0}
        step={0.1}
        value={Math.min(current, total || 0)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-accent disabled:cursor-default"
        disabled={!ready || !total}
        aria-label="Avanzamento"
      />
      <span className="flex-shrink-0 font-mono text-xs tabular-nums text-muted">
        {fmtTime(current)} / {fmtTime(total)}
      </span>
    </div>
  );
}
