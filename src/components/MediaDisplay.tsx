"use client";

import YouTubeEmbed from "./YouTubeEmbed";

interface Props {
  imageUrl: string;
  mediaType?: string | null;
  className?: string;
  /** Solo per YouTube: avvia in muto (anteprima admin). Default false. */
  muted?: boolean;
  /** Solo per YouTube: nasconde il video e mostra una player bar audio. */
  audioOnly?: boolean | null;
  /** Solo per YouTube: durata massima di riproduzione in secondi (null = intera). */
  maxDuration?: number | null;
}

export default function MediaDisplay({
  imageUrl,
  mediaType,
  className = "",
  muted = false,
  audioOnly = false,
  maxDuration = null,
}: Props) {
  if (mediaType === "youtube") {
    // In solo-audio non serve il box 16:9: la bar definisce la propria altezza.
    const wrap = audioOnly ? `w-full ${className}` : `w-full aspect-video rounded-xl ${className}`;
    return (
      <YouTubeEmbed
        url={imageUrl}
        className={wrap}
        muted={muted}
        audioOnly={!!audioOnly}
        maxDuration={maxDuration}
      />
    );
  }
  if (mediaType === "video") {
    return <video src={imageUrl} className={`rounded-xl ${className}`} controls autoPlay muted />;
  }
  return <img src={imageUrl} alt="" className={`rounded-xl object-contain ${className}`} />;
}
