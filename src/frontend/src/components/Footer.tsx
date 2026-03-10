import { useEffect, useState } from "react";

const FULL_TEXT = "RAHUL PARMAR";

export default function Footer() {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (displayText.length < FULL_TEXT.length) {
      const t = setTimeout(
        () => setDisplayText(FULL_TEXT.slice(0, displayText.length + 1)),
        110,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDisplayText(""), 2500);
    return () => clearTimeout(t);
  }, [displayText]);

  const year = new Date().getFullYear();

  return (
    <footer
      className="flex-shrink-0 flex items-center justify-between px-6 py-1.5 border-t border-border/30 relative overflow-hidden"
      style={{
        background: "oklch(0.07 0.015 270)",
        minHeight: "36px",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.4 0.1 300 / 0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(0.4 0.1 300 / 0.4) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="flex items-center gap-2 relative z-10">
        <span className="pulse-heart text-base">❤️</span>
        <span className="text-xs text-muted-foreground tracking-wide">
          Created by
        </span>
        <span
          className="neon-text text-xs font-black tracking-widest px-2 py-0.5 rounded"
          style={{
            background: "linear-gradient(135deg, #ff0066, #ff6600)",
            color: "white",
            boxShadow:
              "0 0 10px rgba(255,0,100,0.5), 0 0 20px rgba(255,0,100,0.3)",
            textShadow: "0 0 8px rgba(255,200,200,0.8)",
            minWidth: "110px",
            display: "inline-block",
          }}
        >
          {displayText}
          <span style={{ color: "rgba(255,255,255,0.7)" }}>|</span>
        </span>
        <span className="pulse-heart text-base">❤️</span>
      </div>

      <div className="relative z-10">
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          © {year} Built with caffeine.ai
        </a>
      </div>
    </footer>
  );
}
