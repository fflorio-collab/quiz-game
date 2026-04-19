"use client";

import YouTubeEmbed from "./YouTubeEmbed";

interface Props {
  imageUrl: string;
  mediaType?: string | null;
  className?: string;
  /** Solo per YouTube: avvia in muto (anteprima admin). Default false. */
  muted?: boolean;
}

export default function MediaDisplay({ imageUrl, mediaType, className = "", muted = false }: Props) {
  if (mediaType === "youtube") {
    return <YouTubeEmbed url={imageUrl} className={`w-full aspect-video rounded-xl ${className}`} muted={muted} />;
  }
  if (mediaType === "video") {
    return <video src={imageUrl} className={`rounded-xl ${className}`} controls autoPlay muted />;
  }
  return <img src={imageUrl} alt="" className={`rounded-xl object-contain ${className}`} />;
}
