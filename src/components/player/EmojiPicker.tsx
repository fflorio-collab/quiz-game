"use client";

// Avatar-emoji: scelta rapida (l'upload immagine è opzionale/omesso per l'evento).
export const AVATAR_EMOJIS = [
  "😀", "😎", "🤩", "🥳", "🤓", "🧐", "🤠", "🥸",
  "👽", "🤖", "👻", "🐱", "🐶", "🦊", "🦁", "🐯",
  "🐨", "🐼", "🐸", "🐵", "🦄", "🐲", "🦖", "🦉",
  "🐙", "🦈", "🐝", "🦋", "🌟", "🔥", "⚡", "💎",
  "🎮", "🎯", "🚀", "👑",
];

interface Props {
  value: string | null;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {AVATAR_EMOJIS.map((e) => {
        const active = value === e;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            aria-pressed={active}
            className={
              "grid aspect-square place-items-center rounded-xl text-2xl transition-all active:scale-90 " +
              (active
                ? "border-2 border-gold bg-gold/15 scale-105 shadow-glow"
                : "border border-line bg-panel hover:border-gold/40")
            }
          >
            {e}
          </button>
        );
      })}
    </div>
  );
}
