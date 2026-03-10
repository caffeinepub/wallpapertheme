const EMOJIS = [
  "😀",
  "😂",
  "🥰",
  "😍",
  "🤩",
  "😎",
  "🤔",
  "😮",
  "😢",
  "😭",
  "😡",
  "🤬",
  "🥳",
  "🤗",
  "😴",
  "🤢",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "🫶",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "💔",
  "💯",
  "🔥",
  "✨",
  "⭐",
  "🌙",
  "☀️",
  "🌈",
  "🎉",
  "🎊",
  "🎁",
  "🏆",
  "🥇",
  "🎯",
  "🚀",
  "💡",
  "💰",
  "👀",
  "🍕",
  "🍔",
  "🍰",
  "🎂",
  "🍺",
  "☕",
  "🌸",
  "🐶",
  "🐱",
  "🦋",
  "🌺",
  "🌊",
  "⚡",
  "💫",
  "🎵",
  "🎸",
];

function getEmojiUrl(emoji: string): string {
  // Convert emoji to codepoints, joined by "-"
  const codepoints: string[] = [];
  let i = 0;
  while (i < emoji.length) {
    const cp = emoji.codePointAt(i);
    if (cp !== undefined) {
      // Skip variation selector (fe0f) — Twemoji handles it without vs16 in some cases
      if (cp !== 0xfe0f) {
        codepoints.push(cp.toString(16));
      }
      i += cp > 0xffff ? 2 : 1;
    } else {
      i++;
    }
  }
  const joined = codepoints.join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${joined}.png`;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="hover:bg-secondary/80 rounded-lg p-1.5 transition-colors leading-none flex items-center justify-center"
          onClick={() => onSelect(emoji)}
          title={emoji}
        >
          <img
            src={getEmojiUrl(emoji)}
            alt={emoji}
            width={28}
            height={28}
            style={{ objectFit: "contain" }}
            onError={(e) => {
              // Fallback to text emoji if CDN fails
              const btn = e.currentTarget.parentElement;
              if (btn) {
                e.currentTarget.style.display = "none";
                btn.textContent = emoji;
                btn.style.fontSize = "20px";
              }
            }}
          />
        </button>
      ))}
    </div>
  );
}
