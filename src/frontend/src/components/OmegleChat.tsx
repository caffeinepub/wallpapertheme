import {
  Camera,
  CameraOff,
  ExternalLink,
  Globe,
  Mic,
  MicOff,
  Shield,
  SkipForward,
  Square,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface OmegleChatProps {
  open: boolean;
  onClose: () => void;
}

type Phase =
  | "landing"
  | "requesting"
  | "permission-denied"
  | "queued"
  | "connected"
  | "disconnected";

interface ChatMsg {
  from: "You" | "Stranger";
  text: string;
  ts: number;
}

const COUNTRIES = [
  { name: "India", flag: "🇮🇳" },
  { name: "USA", flag: "🇺🇸" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Russia", flag: "🇷🇺" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "UK", flag: "🇬🇧" },
  { name: "France", flag: "🇫🇷" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Pakistan", flag: "🇵🇰" },
  { name: "Bangladesh", flag: "🇧🇩" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Poland", flag: "🇵🇱" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "gu", label: "Gujarati" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Español" },
  { code: "tr", label: "Turkish" },
  { code: "ar", label: "Arabic" },
  { code: "ko", label: "Korean" },
  { code: "id", label: "Indonesian" },
  { code: "bn", label: "Bengali" },
  { code: "pl", label: "Polish" },
];

function playConnectTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    for (const [i, freq] of notes.entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  } catch {
    // ignore audio errors
  }
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function OmegleChat({ open, onClose }: OmegleChatProps) {
  const [phase, setPhase] = useState<Phase>("landing");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [lang, setLang] = useState("en");
  const [activeCount, setActiveCount] = useState<number>(0);
  const [stranger, setStranger] = useState<{
    country: string;
    flag: string;
    age: number;
  } | null>(null);
  const [showRipple, setShowRipple] = useState(false);
  const [queueTime, setQueueTime] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgCountRef = useRef(0);

  // Active user count simulation
  useEffect(() => {
    if (!open) return;
    setActiveCount(Math.floor(Math.random() * 300) + 150);
    const t = setInterval(() => {
      setActiveCount(Math.floor(Math.random() * 300) + 150);
    }, 8000);
    return () => clearInterval(t);
  }, [open]);

  // Scroll chat to bottom when message count changes
  useEffect(() => {
    msgCountRef.current = messages.length;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const attachLocal = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => {});
    }
  }, []);

  const stopAll = useCallback(() => {
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    for (const t of localStreamRef.current?.getTracks() ?? []) {
      t.stop();
    }
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const resetToLanding = useCallback(() => {
    stopAll();
    setPhase("landing");
    setMessages([]);
    setStranger(null);
    setQueueTime(0);
  }, [stopAll]);

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newVal = !camOn;
    for (const t of stream.getVideoTracks()) {
      t.enabled = newVal;
    }
    setCamOn(newVal);
  };

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newVal = !micOn;
    for (const t of stream.getAudioTracks()) {
      t.enabled = newVal;
    }
    setMicOn(newVal);
  };

  const simulateConnect = useCallback(() => {
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    const countryInfo = randomItem(COUNTRIES);
    setStranger({
      country: countryInfo.name,
      flag: countryInfo.flag,
      age: Math.floor(Math.random() * 15) + 18,
    });
    setPhase("connected");
    setMessages([]);
    playConnectTone();
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 2000);
    toast.success("Connected to a stranger!");
  }, []);

  const joinQueue = useCallback(
    (stream?: MediaStream) => {
      if (stream) attachLocal(stream);
      setPhase("queued");
      setQueueTime(0);
      queueTimerRef.current = setInterval(
        () => setQueueTime((t) => t + 1),
        1000,
      );
      const delay = 2000 + Math.random() * 4000;
      connectTimeoutRef.current = setTimeout(() => {
        simulateConnect();
      }, delay);
    },
    [attachLocal, simulateConnect],
  );

  const handleStart = async () => {
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: true,
      });
      setCamOn(true);
      setMicOn(true);
      joinQueue(stream);
    } catch (err) {
      console.error(err);
      setPhase("permission-denied");
    }
  };

  const handleNext = async () => {
    stopAll();
    setMessages([]);
    setStranger(null);
    setQueueTime(0);
    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        joinQueue(stream);
      } catch {
        setPhase("permission-denied");
      }
    } else {
      joinQueue();
    }
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    setMessages((p) => [...p, { from: "You", text, ts: Date.now() }]);
  };

  const handleClose = () => {
    resetToLanding();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      stopAll();
      setPhase("landing");
      setMessages([]);
      setStranger(null);
    }
  }, [open, stopAll]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      <AnimatePresence>
        {showRipple && (
          <motion.div
            key="ripple"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border-2"
                style={{ borderColor: "oklch(0.75 0.28 300)" }}
                initial={{ width: 100, height: 100, opacity: 0.8 }}
                animate={{ width: 600, height: 600, opacity: 0 }}
                transition={{ duration: 1.5, delay: i * 0.3, ease: "easeOut" }}
              />
            ))}
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-6xl"
            >
              🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="relative w-full h-full max-w-6xl mx-auto flex flex-col"
        style={{
          background:
            "radial-gradient(ellipse at top, oklch(0.12 0.06 280), oklch(0.06 0.02 270))",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: "rgba(10,5,25,0.95)",
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
                  background:
                    "linear-gradient(90deg, #c084fc, #818cf8, #67e8f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Omegle Live
              </h2>
              <p className="text-xs" style={{ color: "rgba(180,180,220,0.6)" }}>
                Random Video Chat
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
              onClick={handleClose}
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {phase === "landing" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 p-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 3,
                }}
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
                  Meet People Worldwide
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "rgba(180,180,220,0.7)" }}
                >
                  Random video chat with strangers across the globe
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
                onClick={handleStart}
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
                Camera and microphone access required
              </p>
            </motion.div>
          )}

          {phase === "requesting" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1.5,
                  ease: "linear",
                }}
                className="w-16 h-16 rounded-full border-4"
                style={{
                  borderColor: "rgba(180,60,255,0.2)",
                  borderTopColor: "rgb(192,132,252)",
                }}
              />
              <p className="text-lg" style={{ color: "rgba(200,180,255,0.8)" }}>
                Requesting camera &amp; microphone...
              </p>
              <p className="text-sm" style={{ color: "rgba(160,160,200,0.5)" }}>
                Please allow access in your browser
              </p>
            </div>
          )}

          {phase === "permission-denied" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              <div className="text-5xl">🚫</div>
              <h3
                className="text-xl font-bold"
                style={{ color: "rgb(252,165,165)" }}
              >
                Camera/Microphone Blocked
              </h3>
              <div
                className="max-w-sm text-sm rounded-xl p-4 space-y-2"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "rgba(252,165,165,0.8)",
                }}
              >
                <p className="font-semibold">To enable:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the 🔒 lock icon in the address bar</li>
                  <li>
                    Set Camera to <strong>Allow</strong>
                  </li>
                  <li>
                    Set Microphone to <strong>Allow</strong>
                  </li>
                  <li>Refresh the page</li>
                </ol>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-xl font-semibold"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "rgb(252,165,165)",
                }}
              >
                Refresh Page
              </button>
            </div>
          )}

          {phase === "queued" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      border: "2px solid oklch(0.65 0.25 300)",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%,-50%)",
                    }}
                    animate={{
                      width: [60, 160],
                      height: [60, 160],
                      opacity: [0.6, 0],
                    }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 2,
                      delay: i * 0.65,
                      ease: "easeOut",
                    }}
                  />
                ))}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl relative z-10"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.45 0.28 300), oklch(0.4 0.22 260))",
                    boxShadow: "0 0 30px oklch(0.55 0.28 300 / 0.5)",
                  }}
                >
                  🔍
                </div>
              </div>
              <div className="text-center">
                <p
                  className="text-lg font-semibold"
                  style={{ color: "rgba(200,180,255,0.9)" }}
                >
                  Finding a stranger...
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "rgba(160,160,200,0.5)" }}
                >
                  {queueTime}s elapsed
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: "rgba(134,239,172,0.8)" }}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {activeCount.toLocaleString()} people online
              </div>
              <button
                type="button"
                onClick={resetToLanding}
                data-ocid="omegle.cancel_button"
                className="px-6 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "rgb(252,165,165)",
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {(phase === "connected" || phase === "disconnected") && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-0">
              {/* Videos */}
              <div className="flex-1 flex flex-col md:flex-row gap-2 p-3 overflow-hidden">
                {/* Stranger video */}
                <div
                  className="relative flex-1 rounded-2xl overflow-hidden"
                  style={{
                    background: "oklch(0.08 0.03 270)",
                    border: "1px solid rgba(180,60,255,0.2)",
                    minHeight: 200,
                  }}
                >
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-cover"
                  />
                  {phase === "disconnected" && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                      style={{ background: "rgba(0,0,0,0.75)" }}
                    >
                      <p
                        className="text-lg font-bold"
                        style={{ color: "rgb(252,165,165)" }}
                      >
                        Stranger disconnected
                      </p>
                      <button
                        type="button"
                        onClick={handleNext}
                        data-ocid="omegle.primary_button"
                        className="px-6 py-2.5 rounded-xl font-semibold text-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(0.55 0.28 300), oklch(0.5 0.25 250))",
                          color: "white",
                        }}
                      >
                        Find New Stranger
                      </button>
                    </div>
                  )}
                  {stranger && phase === "connected" && (
                    <div
                      className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
                      style={{
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(180,60,255,0.3)",
                        color: "white",
                      }}
                    >
                      <span className="text-lg">{stranger.flag}</span>
                      <span className="font-semibold">Stranger</span>
                      <span style={{ color: "rgba(200,180,255,0.7)" }}>
                        {stranger.country} · {stranger.age}y
                      </span>
                    </div>
                  )}
                  {phase === "connected" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ pointerEvents: "none" }}
                    >
                      <div className="text-4xl opacity-20">👤</div>
                    </div>
                  )}
                  <div
                    className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold"
                    style={{
                      background: "rgba(239,68,68,0.8)",
                      color: "white",
                    }}
                  >
                    STRANGER
                  </div>
                </div>

                {/* Local video */}
                <div
                  className="relative rounded-2xl overflow-hidden md:w-52"
                  style={{
                    background: "oklch(0.08 0.03 270)",
                    border: "1px solid rgba(180,60,255,0.2)",
                    minHeight: 140,
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!camOn && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.8)" }}
                    >
                      <CameraOff
                        size={28}
                        style={{ color: "rgba(200,180,255,0.5)" }}
                      />
                    </div>
                  )}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: "rgba(34,197,94,0.8)",
                      color: "white",
                    }}
                  >
                    YOU
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                    <button
                      type="button"
                      onClick={toggleCam}
                      data-ocid="omegle.toggle"
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{
                        background: camOn
                          ? "rgba(34,197,94,0.25)"
                          : "rgba(239,68,68,0.3)",
                        border: `1px solid ${
                          camOn ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"
                        }`,
                      }}
                    >
                      {camOn ? (
                        <Camera
                          size={14}
                          style={{ color: "rgb(134,239,172)" }}
                        />
                      ) : (
                        <CameraOff
                          size={14}
                          style={{ color: "rgb(252,165,165)" }}
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMic}
                      data-ocid="omegle.switch"
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{
                        background: micOn
                          ? "rgba(34,197,94,0.25)"
                          : "rgba(239,68,68,0.3)",
                        border: `1px solid ${
                          micOn ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"
                        }`,
                      }}
                    >
                      {micOn ? (
                        <Mic size={14} style={{ color: "rgb(134,239,172)" }} />
                      ) : (
                        <MicOff
                          size={14}
                          style={{ color: "rgb(252,165,165)" }}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat panel */}
              <div
                className="flex flex-col md:w-72 border-t md:border-t-0 md:border-l"
                style={{
                  borderColor: "rgba(180,60,255,0.2)",
                  background: "rgba(8,5,20,0.6)",
                  maxHeight: 360,
                }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                  style={{ borderBottom: "1px solid rgba(180,60,255,0.15)" }}
                >
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    data-ocid="omegle.select"
                    className="flex-1 text-xs rounded-lg px-2 py-1 outline-none"
                    style={{
                      background: "rgba(30,20,60,0.8)",
                      border: "1px solid rgba(180,60,255,0.3)",
                      color: "rgba(200,180,255,0.9)",
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "rgba(134,239,172,0.8)" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                  {messages.length === 0 && (
                    <p
                      className="text-center text-xs mt-4"
                      style={{ color: "rgba(160,160,200,0.4)" }}
                    >
                      {phase === "connected" ? "Say hello!" : "Chat ended"}
                    </p>
                  )}
                  {messages.map((m) => (
                    <motion.div
                      key={m.ts}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${
                        m.from === "You" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className="max-w-[85%] px-3 py-2 rounded-xl text-sm"
                        style={{
                          background:
                            m.from === "You"
                              ? "linear-gradient(135deg, oklch(0.45 0.28 300), oklch(0.4 0.22 260))"
                              : "rgba(40,30,70,0.9)",
                          border:
                            m.from === "You"
                              ? "none"
                              : "1px solid rgba(180,60,255,0.2)",
                          color: "rgba(240,230,255,0.95)",
                        }}
                      >
                        <p
                          className="text-[10px] font-bold mb-0.5"
                          style={{
                            color:
                              m.from === "You"
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(180,140,255,0.8)",
                          }}
                        >
                          {m.from}
                        </p>
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div
                  className="flex gap-2 p-3 flex-shrink-0"
                  style={{ borderTop: "1px solid rgba(180,60,255,0.15)" }}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    disabled={phase === "disconnected"}
                    data-ocid="omegle.input"
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{
                      background: "rgba(30,20,60,0.8)",
                      border: "1px solid rgba(180,60,255,0.3)",
                      color: "rgba(220,200,255,0.9)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={phase === "disconnected"}
                    data-ocid="omegle.submit_button"
                    className="px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.5 0.28 300), oklch(0.45 0.22 260))",
                      color: "white",
                    }}
                  >
                    Send
                  </button>
                </div>

                <div className="flex gap-2 px-3 pb-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleNext}
                    data-ocid="omegle.secondary_button"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.55 0.28 300), oklch(0.5 0.25 250))",
                      boxShadow: "0 0 20px oklch(0.55 0.28 300 / 0.3)",
                      color: "white",
                    }}
                  >
                    <SkipForward size={14} />
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={resetToLanding}
                    data-ocid="omegle.delete_button"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(239,68,68,0.35)",
                      color: "rgb(252,165,165)",
                    }}
                  >
                    <Square size={13} />
                    Stop
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
