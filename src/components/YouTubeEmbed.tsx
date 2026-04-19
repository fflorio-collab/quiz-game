"use client";

import { useEffect, useRef } from "react";

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
}

export default function YouTubeEmbed({ url, className, muted = false }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoId = extractYouTubeId(url);

  const params = new URLSearchParams({
    autoplay: "1",
    loop: "1",
    playlist: videoId ?? "",   // necessario per il loop
    controls: "0",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",       // nessuna annotazione
    fs: "0",                   // no fullscreen button
    disablekb: "1",
    enablejsapi: "1",
    mute: muted ? "1" : "0",
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?${params}`
    : null;

  useEffect(() => {
    if (!videoId || muted) return;
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

  if (!embedUrl) {
    return (
      <div className="text-danger text-sm p-3 bg-danger/10 rounded-lg">
        URL YouTube non valido — usa youtube.com/watch?v=... o youtu.be/...
      </div>
    );
  }

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
