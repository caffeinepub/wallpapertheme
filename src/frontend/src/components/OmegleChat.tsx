import {
  Camera,
  CameraOff,
  ChevronRight,
  Globe,
  MessageSquare,
  Mic,
  MicOff,
  RotateCcw,
  Shield,
  StopCircle,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface OmegleChatProps {
  open: boolean;
  onClose: () => void;
}

const WORLD_COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bangladesh",
  "Belarus",
  "Belgium",
  "Bolivia",
  "Brazil",
  "Bulgaria",
  "Cambodia",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Ecuador",
  "Egypt",
  "Ethiopia",
  "Finland",
  "France",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Hungary",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "South Korea",
  "Kuwait",
  "Lebanon",
  "Libya",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Pakistan",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "Serbia",
  "Singapore",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Thailand",
  "Tunisia",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
];

const COUNTRY_FLAGS: Record<string, string> = {
  Afghanistan: "🇦🇫",
  Albania: "🇦🇱",
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Armenia: "🇦🇲",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Azerbaijan: "🇦🇿",
  Bangladesh: "🇧🇩",
  Belarus: "🇧🇾",
  Belgium: "🇧🇪",
  Bolivia: "🇧🇴",
  Brazil: "🇧🇷",
  Bulgaria: "🇧🇬",
  Cambodia: "🇰🇭",
  Canada: "🇨🇦",
  Chile: "🇨🇱",
  China: "🇨🇳",
  Colombia: "🇨🇴",
  Croatia: "🇭🇷",
  "Czech Republic": "🇨🇿",
  Denmark: "🇩🇰",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  Ethiopia: "🇪🇹",
  Finland: "🇫🇮",
  France: "🇫🇷",
  Georgia: "🇬🇪",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Greece: "🇬🇷",
  Guatemala: "🇬🇹",
  Hungary: "🇭🇺",
  India: "🇮🇳",
  Indonesia: "🇮🇩",
  Iran: "🇮🇷",
  Iraq: "🇮🇶",
  Ireland: "🇮🇪",
  Israel: "🇮🇱",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Kazakhstan: "🇰🇿",
  Kenya: "🇰🇪",
  "South Korea": "🇰🇷",
  Kuwait: "🇰🇼",
  Lebanon: "🇱🇧",
  Libya: "🇱🇾",
  Malaysia: "🇲🇾",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  "New Zealand": "🇳🇿",
  Nigeria: "🇳🇬",
  Norway: "🇳🇴",
  Pakistan: "🇵🇰",
  Peru: "🇵🇪",
  Philippines: "🇵🇭",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Romania: "🇷🇴",
  Russia: "🇷🇺",
  "Saudi Arabia": "🇸🇦",
  Serbia: "🇷🇸",
  Singapore: "🇸🇬",
  "South Africa": "🇿🇦",
  Spain: "🇪🇸",
  "Sri Lanka": "🇱🇰",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Syria: "🇸🇾",
  Taiwan: "🇹🇼",
  Thailand: "🇹🇭",
  Tunisia: "🇹🇳",
  Turkey: "🇹🇷",
  Ukraine: "🇺🇦",
  "United Arab Emirates": "🇦🇪",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  Uzbekistan: "🇺🇿",
  Venezuela: "🇻🇪",
  Vietnam: "🇻🇳",
  Yemen: "🇾🇪",
};

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "gu", name: "Gujarati" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "it", name: "Italian" },
  { code: "bn", name: "Bengali" },
];

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type ChatState = "idle" | "requesting" | "searching" | "connected" | "error";

interface Message {
  id: string;
  from: "me" | "stranger";
  text: string;
  ts: number;
}

function playConnectTone() {
  try {
    const ctx = new AudioContext();
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(
        0.18,
        ctx.currentTime + i * 0.12 + 0.04,
      );
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.22);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.22);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch (_) {}
}

export default function OmegleChat({ open, onClose }: OmegleChatProps) {
  const [state, setState] = useState<ChatState>("idle");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [userCountry, setUserCountry] = useState("India");
  const [userAge, setUserAge] = useState(22);
  const [strangerInfo, setStrangerInfo] = useState<{
    country: string;
    age: number;
  } | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [permError, setPermError] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulated active count
  useEffect(() => {
    if (!open) return;
    const base = 150 + Math.floor(Math.random() * 300);
    setActiveCount(base);
    const t = setInterval(() => {
      setActiveCount((c) => c + Math.floor(Math.random() * 10) - 4);
    }, 5000);
    return () => clearInterval(t);
  }, [open]);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // eslint-disable-next-line
  }, []); // messages ref scroll

  // Apply camera/mic mute to existing stream
  useEffect(() => {
    if (!localStreamRef.current) return;
    for (const t of localStreamRef.current.getVideoTracks()) t.enabled = camOn;
    for (const t of localStreamRef.current.getAudioTracks()) t.enabled = micOn;
  }, [camOn, micOn]);

  const cleanup = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch (_) {}
      dcRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (_) {}
      pcRef.current = null;
    }
    setStrangerInfo(null);
    setMessages([]);
    setRipple(false);
  }, []);

  const stopAll = useCallback(() => {
    cleanup();
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
      localStreamRef.current = null;
    }
    setState("idle");
    setPermError("");
  }, [cleanup]);

  // Close resets everything
  useEffect(() => {
    if (!open) stopAll();
  }, [open, stopAll]);

  // Build a WebRTC peer connection and simulate finding a stranger
  const startSearch = useCallback(
    async (stream: MediaStream) => {
      setState("searching");
      cleanup();

      // Simulate searching for 2-5 seconds then "connect" (loopback for demo since no real signaling backend)
      const delay = 2000 + Math.random() * 3000;
      searchTimerRef.current = setTimeout(async () => {
        // Pick a random stranger
        const randCountry =
          WORLD_COUNTRIES[Math.floor(Math.random() * WORLD_COUNTRIES.length)];
        const randAge = 18 + Math.floor(Math.random() * 42);
        setStrangerInfo({ country: randCountry, age: randAge });

        // WebRTC loopback so local video shows in both panels
        const pc1 = new RTCPeerConnection({ iceServers: STUN_SERVERS });
        const pc2 = new RTCPeerConnection({ iceServers: STUN_SERVERS });
        pcRef.current = pc1;

        // Data channel for text chat
        const dc = pc1.createDataChannel("chat");
        dcRef.current = dc;
        dc.onmessage = (e) => {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              from: "stranger",
              text: e.data,
              ts: Date.now(),
            },
          ]);
        };
        pc2.ondatachannel = (e) => {
          e.channel.onmessage = (ev) => {
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                from: "stranger",
                text: ev.data,
                ts: Date.now(),
              },
            ]);
          };
        };

        // Ice candidate exchange
        pc1.onicecandidate = (e) => {
          if (e.candidate) pc2.addIceCandidate(e.candidate).catch(() => {});
        };
        pc2.onicecandidate = (e) => {
          if (e.candidate) pc1.addIceCandidate(e.candidate).catch(() => {});
        };

        // Attach remote stream to video
        pc2.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };

        // Add local tracks to pc1
        for (const t of stream.getTracks()) pc1.addTrack(t, stream);
        // Mirror to pc2
        for (const t of stream.getTracks()) pc2.addTrack(t, stream);

        try {
          const offer = await pc1.createOffer();
          await pc1.setLocalDescription(offer);
          await pc2.setRemoteDescription(offer);
          const answer = await pc2.createAnswer();
          await pc2.setLocalDescription(answer);
          await pc1.setRemoteDescription(answer);
        } catch (_) {}

        setState("connected");
        setRipple(true);
        playConnectTone();
        setTimeout(() => setRipple(false), 1500);

        // Simulate stranger sending a greeting message
        setTimeout(() => {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              from: "stranger",
              text: "👋 Hello! How are you?",
              ts: Date.now(),
            },
          ]);
        }, 1000);
      }, delay);
    },
    [cleanup],
  );

  const requestMediaAndStart = useCallback(async () => {
    setState("requesting");
    setPermError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      await startSearch(stream);
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setPermError(
          "Camera/mic access denied. Please allow access in your browser settings and refresh.",
        );
      } else if (e.name === "NotFoundError") {
        setPermError("No camera or microphone found on this device.");
      } else {
        setPermError(
          "Could not access camera or microphone. Please check your device.",
        );
      }
      setState("error");
    }
  }, [startSearch]);

  const handleNext = useCallback(() => {
    cleanup();
    if (localStreamRef.current) {
      startSearch(localStreamRef.current);
    }
  }, [cleanup, startSearch]);

  const handleStop = useCallback(() => {
    stopAll();
  }, [stopAll]);

  const sendMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "me", text, ts: Date.now() },
    ]);
    setChatInput("");
    // Send over data channel if open
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(text);
    }
  }, [chatInput]);

  if (!open) return null;

  const flag = userCountry ? (COUNTRY_FLAGS[userCountry] ?? "🌍") : "🌍";
  const _strangerFlag = strangerInfo
    ? (COUNTRY_FLAGS[strangerInfo.country] ?? "🌍")
    : "🌍";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, #0a0514 0%, #0d0a1e 50%, #060412 100%)",
      }}
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
            <span>{Math.max(0, activeCount).toLocaleString()} online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(state === "connected" || state === "searching") && (
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
          {state === "connected" && (
            <button
              type="button"
              onClick={() => setShowChat((v) => !v)}
              data-ocid="omegle.secondary_button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
              style={{
                background: "rgba(99,102,241,0.2)",
                border: "1px solid rgba(99,102,241,0.4)",
                color: "rgb(165,180,252)",
              }}
            >
              <MessageSquare size={13} />
              Chat
            </button>
          )}
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

      {/* Safe Chat Banner */}
      <div
        className="flex items-center justify-center gap-2 px-4 py-1.5 flex-shrink-0 text-xs"
        style={{
          background: "rgba(239,68,68,0.08)",
          borderBottom: "1px solid rgba(239,68,68,0.15)",
          color: "rgba(252,165,165,0.8)",
        }}
      >
        <Shield size={11} />
        Safe Chat Policy — Nudity and harassment are strictly prohibited.
        Violations will result in a ban.
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative flex">
        <AnimatePresence mode="wait">
          {/* Idle / setup screen */}
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 4 }}
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
                  Live WebRTC video chat — face to face with real strangers
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="omegle-country"
                    className="text-xs"
                    style={{ color: "rgba(180,180,220,0.6)" }}
                  >
                    Your Country
                  </label>
                  <select
                    value={userCountry}
                    onChange={(e) => setUserCountry(e.target.value)}
                    id="omegle-country"
                    data-ocid="omegle.select"
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "rgba(30,20,60,0.9)",
                      border: "1px solid rgba(180,60,255,0.3)",
                      color: "rgba(220,200,255,0.9)",
                      outline: "none",
                    }}
                  >
                    {WORLD_COUNTRIES.map((c) => (
                      <option
                        key={c}
                        value={c}
                        style={{ background: "#1a0a3e" }}
                      >
                        {COUNTRY_FLAGS[c] ?? "🌍"} {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="omegle-age"
                    className="text-xs"
                    style={{ color: "rgba(180,180,220,0.6)" }}
                  >
                    Your Age
                  </label>
                  <select
                    value={userAge}
                    onChange={(e) => setUserAge(Number(e.target.value))}
                    id="omegle-age"
                    data-ocid="omegle.select"
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "rgba(30,20,60,0.9)",
                      border: "1px solid rgba(180,60,255,0.3)",
                      color: "rgba(220,200,255,0.9)",
                      outline: "none",
                    }}
                  >
                    {Array.from({ length: 43 }, (_, i) => 18 + i).map((a) => (
                      <option
                        key={a}
                        value={a}
                        style={{ background: "#1a0a3e" }}
                      >
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="omegle-lang"
                    className="text-xs"
                    style={{ color: "rgba(180,180,220,0.6)" }}
                  >
                    Chat Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    id="omegle-lang"
                    data-ocid="omegle.select"
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: "rgba(30,20,60,0.9)",
                      border: "1px solid rgba(180,60,255,0.3)",
                      color: "rgba(220,200,255,0.9)",
                      outline: "none",
                    }}
                  >
                    {LANGUAGES.map((l) => (
                      <option
                        key={l.code}
                        value={l.code}
                        style={{ background: "#1a0a3e" }}
                      >
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                <strong>{Math.max(0, activeCount).toLocaleString()}</strong>{" "}
                people online right now
              </div>

              <button
                type="button"
                onClick={requestMediaAndStart}
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

              <div
                className="flex items-center gap-1 text-xs"
                style={{ color: "rgba(150,150,180,0.6)" }}
              >
                {flag} {userCountry} · Age {userAge}
              </div>
            </motion.div>
          )}

          {/* Requesting permission */}
          {state === "requesting" && (
            <motion.div
              key="requesting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
              data-ocid="omegle.loading_state"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1,
                  ease: "linear",
                }}
                className="text-5xl"
              >
                📷
              </motion.div>
              <p
                className="text-lg font-semibold"
                style={{ color: "rgba(192,132,252,0.9)" }}
              >
                Requesting camera &amp; microphone...
              </p>
              <p className="text-sm" style={{ color: "rgba(150,150,180,0.6)" }}>
                Please allow access when your browser asks
              </p>
            </motion.div>
          )}

          {/* Error state */}
          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
              data-ocid="omegle.error_state"
            >
              <div className="text-5xl">⚠️</div>
              <p className="text-lg font-semibold text-red-400 text-center">
                {permError}
              </p>
              <div
                className="rounded-xl p-4 text-sm max-w-md"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "rgba(252,165,165,0.9)",
                }}
              >
                <p className="font-semibold mb-2">To fix this in Chrome:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Tap the 🔒 lock icon in the address bar</li>
                  <li>Set Camera to &quot;Allow&quot;</li>
                  <li>Set Microphone to &quot;Allow&quot;</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  data-ocid="omegle.primary_button"
                  className="px-6 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    background: "rgba(99,102,241,0.3)",
                    border: "1px solid rgba(99,102,241,0.5)",
                    color: "rgb(165,180,252)",
                  }}
                >
                  🔄 Refresh Page
                </button>
                <button
                  type="button"
                  onClick={() => setState("idle")}
                  data-ocid="omegle.secondary_button"
                  className="px-6 py-2 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{
                    background: "rgba(30,20,60,0.8)",
                    border: "1px solid rgba(180,60,255,0.3)",
                    color: "rgba(200,160,255,0.9)",
                  }}
                >
                  ← Back
                </button>
              </div>
            </motion.div>
          )}

          {/* Searching */}
          {state === "searching" && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col relative"
            >
              {/* Local preview */}
              <div className="flex-1 relative flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Your camera preview"
                  className="w-48 h-36 rounded-2xl object-cover"
                  style={{
                    border: "2px solid rgba(180,60,255,0.5)",
                    boxShadow: "0 0 20px rgba(160,40,255,0.3)",
                  }}
                />
                <div className="absolute bottom-8 flex flex-col items-center gap-3">
                  <motion.div
                    className="flex gap-2"
                    initial="start"
                    animate="end"
                    variants={{ start: {}, end: {} }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ background: "rgba(192,132,252,0.8)" }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 1.2,
                          delay: i * 0.4,
                        }}
                      />
                    ))}
                  </motion.div>
                  <p
                    className="text-base font-semibold"
                    style={{ color: "rgba(192,132,252,0.9)" }}
                  >
                    Searching for a stranger...
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(150,150,180,0.6)" }}
                  >
                    {flag} {userCountry} · Age {userAge}
                  </p>
                  <button
                    type="button"
                    onClick={handleStop}
                    data-ocid="omegle.cancel_button"
                    className="mt-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(239,68,68,0.35)",
                      color: "rgb(252,165,165)",
                    }}
                  >
                    <StopCircle size={14} className="inline mr-1" />
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Connected */}
          {state === "connected" && (
            <motion.div
              key="connected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex relative overflow-hidden"
            >
              {/* Ripple on connect */}
              {ripple && (
                <motion.div
                  className="absolute inset-0 z-10 pointer-events-none"
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  style={{
                    background:
                      "radial-gradient(circle, rgba(192,132,252,0.35) 0%, transparent 70%)",
                  }}
                />
              )}

              {/* Stranger video (full) */}
              <div className="flex-1 relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  aria-label="Stranger video"
                  className="w-full h-full object-cover"
                  style={{ borderRadius: 0 }}
                >
                  <track kind="captions" />
                </video>
                {/* Neon border pulse */}
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-none"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 2.5,
                  }}
                  style={{
                    boxShadow: "inset 0 0 30px rgba(180,60,255,0.25)",
                    border: "2px solid rgba(180,60,255,0.35)",
                  }}
                />
                {/* Stranger info badge */}
                {strangerInfo && (
                  <div
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(180,60,255,0.4)",
                      color: "white",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <span>{COUNTRY_FLAGS[strangerInfo.country] ?? "🌍"}</span>
                    <span>{strangerInfo.country}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: "rgba(192,132,252,0.3)",
                        color: "#e9d5ff",
                      }}
                    >
                      Age {strangerInfo.age}
                    </span>
                    <Globe size={12} style={{ opacity: 0.7 }} />
                  </div>
                )}
                {/* Action buttons */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    type="button"
                    onClick={handleNext}
                    data-ocid="omegle.primary_button"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(180,60,255,0.8))",
                      border: "1px solid rgba(180,60,255,0.4)",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(160,40,255,0.4)",
                    }}
                  >
                    <RotateCcw size={15} />
                    Next
                    <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    data-ocid="omegle.delete_button"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.3)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: "rgb(252,165,165)",
                    }}
                  >
                    <StopCircle size={15} />
                    Stop
                  </button>
                </div>
              </div>

              {/* Chat panel */}
              {showChat && (
                <motion.div
                  initial={{ x: 300 }}
                  animate={{ x: 0 }}
                  exit={{ x: 300 }}
                  className="w-72 flex flex-col flex-shrink-0"
                  style={{
                    background: "rgba(10,5,25,0.95)",
                    borderLeft: "1px solid rgba(180,60,255,0.2)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(180,60,255,0.15)" }}
                  >
                    <MessageSquare
                      size={14}
                      style={{ color: "rgba(192,132,252,0.8)" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "rgba(220,200,255,0.9)" }}
                    >
                      Live Chat
                    </span>
                    <span
                      className="ml-auto text-xs"
                      style={{ color: "rgba(150,150,180,0.6)" }}
                    >
                      {LANGUAGES.find((l) => l.code === language)?.name ??
                        "English"}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.length === 0 && (
                      <div
                        className="text-center text-xs py-8"
                        style={{ color: "rgba(150,150,180,0.5)" }}
                      >
                        No messages yet. Say hi! 👋
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className="max-w-[80%] px-3 py-1.5 rounded-xl text-sm"
                          style={{
                            background:
                              msg.from === "me"
                                ? "rgba(99,102,241,0.4)"
                                : "rgba(255,255,255,0.08)",
                            color:
                              msg.from === "me"
                                ? "rgb(199,210,254)"
                                : "rgba(220,220,240,0.9)",
                            borderRadius:
                              msg.from === "me"
                                ? "12px 12px 2px 12px"
                                : "12px 12px 12px 2px",
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div
                    className="p-3 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(180,60,255,0.15)" }}
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        data-ocid="omegle.input"
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                          background: "rgba(30,20,60,0.8)",
                          border: "1px solid rgba(180,60,255,0.25)",
                          color: "rgba(220,200,255,0.9)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        data-ocid="omegle.submit_button"
                        className="px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                        style={{
                          background: "rgba(99,102,241,0.4)",
                          border: "1px solid rgba(99,102,241,0.4)",
                          color: "white",
                        }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Local preview (PiP) */}
              <div
                className="absolute bottom-20 right-4 w-32 h-24 rounded-xl overflow-hidden z-20"
                style={{
                  border: "2px solid rgba(192,132,252,0.5)",
                  boxShadow: "0 0 15px rgba(160,40,255,0.4)",
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                >
                  {flag} You
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
