import {
  Camera,
  CameraOff,
  ExternalLink,
  Globe,
  Mic,
  MicOff,
  Shield,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface OmegleChatProps {
  open: boolean;
  onClose: () => void;
}

export default function OmegleChat({ open, onClose }: OmegleChatProps) {
  const [started, setStarted] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) {
      setStarted(false);
      return;
    }
    setActiveCount(Math.floor(Math.random() * 300) + 150);
    const t = setInterval(() => {
      setActiveCount(Math.floor(Math.random() * 300) + 150);
    }, 8000);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.97)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          background: "rgba(10,5,25,0.98)",
          borderBottom: "1px solid rgba(180,60,255,0.3)",
          boxShadow: "0 2px 20px rgba(160,40,255,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎥</span>
          <div>
            <h2
              className="text-lg font-bold"
              style={{
                background: "linear-gradient(90deg, #c084fc, #818cf8, #67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Omegle Live
            </h2>
            <p className="text-xs" style={{ color: "rgba(180,180,220,0.6)" }}>
              Real-Time Video Chat with Strangers
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ml-2"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "rgb(74,222,128)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <Users size={11} />
            <span>{activeCount.toLocaleString()} online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {started && (
            <>
              <button
                type="button"
                onClick={() => setCamOn((v) => !v)}
                data-ocid="omegle.toggle"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: camOn
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(239,68,68,0.2)",
                  border: `1px solid ${camOn ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                  color: camOn ? "rgb(134,239,172)" : "rgb(252,165,165)",
                }}
              >
                {camOn ? <Camera size={13} /> : <CameraOff size={13} />}
                {camOn ? "Cam On" : "Cam Off"}
              </button>
              <button
                type="button"
                onClick={() => setMicOn((v) => !v)}
                data-ocid="omegle.switch"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: micOn
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(239,68,68,0.2)",
                  border: `1px solid ${micOn ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                  color: micOn ? "rgb(134,239,172)" : "rgb(252,165,165)",
                }}
              >
                {micOn ? <Mic size={13} /> : <MicOff size={13} />}
                {micOn ? "Mic On" : "Mic Off"}
              </button>
            </>
          )}
          <a
            href="https://omegleweb.io/video"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.4)",
              color: "rgb(165,180,252)",
            }}
          >
            <Globe size={13} />
            OmegleWeb
            <ExternalLink size={11} />
          </a>
          <button
            type="button"
            onClick={onClose}
            data-ocid="omegle.close_button"
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{
              background: "rgba(239,68,68,0.2)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "rgb(252,165,165)",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence>
          {!started && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3 }}
                className="text-7xl"
              >
                🌍
              </motion.div>
              <div className="text-center">
                <h3
                  className="text-3xl font-bold mb-2"
                  style={{
                    background:
                      "linear-gradient(90deg, #e879f9, #818cf8, #38bdf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Meet Real People Worldwide
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "rgba(180,180,220,0.7)" }}
                >
                  Live video chat powered by OmegleWeb — face to face with real
                  strangers
                </p>
              </div>

              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "rgb(134,239,172)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <strong>{activeCount.toLocaleString()}</strong> people online
                right now
              </div>

              <div
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "rgb(252,165,165)",
                }}
              >
                <Shield size={13} />
                Safe Chat — Nudity &amp; harassment are not allowed
              </div>

              <button
                type="button"
                onClick={() => setStarted(true)}
                data-ocid="omegle.primary_button"
                className="px-12 py-4 rounded-2xl text-lg font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.55 0.28 300), oklch(0.5 0.25 250))",
                  boxShadow:
                    "0 0 40px oklch(0.55 0.28 300 / 0.5), 0 4px 20px rgba(0,0,0,0.4)",
                  color: "white",
                  border: "1px solid rgba(200,100,255,0.4)",
                }}
              >
                🎥 Start Video Chat
              </button>

              <p className="text-xs" style={{ color: "rgba(150,150,180,0.5)" }}>
                Camera and microphone access will be requested by OmegleWeb
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {started && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col"
          >
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs"
              style={{
                background: "rgba(10,5,25,0.9)",
                borderBottom: "1px solid rgba(180,60,255,0.2)",
                color: "rgba(180,180,220,0.7)",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Connected to OmegleWeb.io — Allow camera &amp; microphone when
              prompted
            </div>
            <iframe
              ref={iframeRef}
              src="https://omegleweb.io/video"
              title="OmegleWeb Live Video Chat"
              allow="camera; microphone; autoplay; fullscreen"
              className="flex-1 w-full border-0"
              style={{ background: "#000" }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
