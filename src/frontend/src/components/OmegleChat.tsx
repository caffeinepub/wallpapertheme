import {
  Camera,
  CameraOff,
  Flag,
  Mic,
  MicOff,
  Send,
  Shield,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface OmegleChatProps {
  open: boolean;
  onClose: () => void;
}

type PermissionState = "idle" | "requesting" | "granted" | "denied";
type AppStep = "permission" | "world-select" | "chat";

interface ChatMsg {
  from: "You" | "Stranger";
  text: string;
  ts: number;
}

type Language = {
  code: string;
  label: string;
  flag: string;
  placeholder: string;
};

interface WorldRoom {
  id: string;
  emoji: string;
  label: string;
  description: string;
  onlineMin: number;
  onlineMax: number;
}

interface StrangerProfile {
  country: string;
  flag: string;
  age: number;
  world: WorldRoom;
}

const WORLD_ROOMS: WorldRoom[] = [
  {
    id: "general",
    emoji: "🌍",
    label: "General",
    description: "Most popular — meet anyone",
    onlineMin: 300,
    onlineMax: 500,
  },
  {
    id: "music",
    emoji: "🎵",
    label: "Music Lovers",
    description: "Share your sound",
    onlineMin: 80,
    onlineMax: 200,
  },
  {
    id: "gaming",
    emoji: "🎮",
    label: "Gamers",
    description: "Talk games, play together",
    onlineMin: 120,
    onlineMax: 350,
  },
  {
    id: "students",
    emoji: "📚",
    label: "Students",
    description: "Study & connect",
    onlineMin: 90,
    onlineMax: 250,
  },
  {
    id: "professionals",
    emoji: "💼",
    label: "Professionals",
    description: "Career & networking",
    onlineMin: 50,
    onlineMax: 150,
  },
  {
    id: "creatives",
    emoji: "🎨",
    label: "Creatives",
    description: "Art, design & ideas",
    onlineMin: 60,
    onlineMax: 180,
  },
  {
    id: "language",
    emoji: "🌐",
    label: "Language Exchange",
    description: "Practice new languages",
    onlineMin: 70,
    onlineMax: 220,
  },
];

const LANGUAGES: Language[] = [
  {
    code: "en-US",
    label: "English",
    flag: "🇬🇧",
    placeholder: "Type a message...",
  },
  { code: "hi-IN", label: "Hindi", flag: "🇮🇳", placeholder: "संदेश टाइप करें..." },
  {
    code: "gu-IN",
    label: "Gujarati",
    flag: "🇮🇳",
    placeholder: "સંદેશ ટાઈપ કરો...",
  },
  {
    code: "hi-IN",
    label: "Hinglish",
    flag: "🔀",
    placeholder: "Kuch bhi likho...",
  },
  {
    code: "es-ES",
    label: "Spanish",
    flag: "🇪🇸",
    placeholder: "Escribe un mensaje...",
  },
  {
    code: "fr-FR",
    label: "French",
    flag: "🇫🇷",
    placeholder: "Tapez un message...",
  },
  { code: "ar-SA", label: "Arabic", flag: "🇸🇦", placeholder: "اكتب رسالة..." },
  {
    code: "pt-BR",
    label: "Portuguese",
    flag: "🇧🇷",
    placeholder: "Digite uma mensagem...",
  },
  {
    code: "ru-RU",
    label: "Russian",
    flag: "🇷🇺",
    placeholder: "Введите сообщение...",
  },
  {
    code: "ja-JP",
    label: "Japanese",
    flag: "🇯🇵",
    placeholder: "メッセージを入力...",
  },
  {
    code: "ko-KR",
    label: "Korean",
    flag: "🇰🇷",
    placeholder: "메시지를 입력하세요...",
  },
  {
    code: "de-DE",
    label: "German",
    flag: "🇩🇪",
    placeholder: "Nachricht eingeben...",
  },
  { code: "tr-TR", label: "Turkish", flag: "🇹🇷", placeholder: "Mesaj yaz..." },
  {
    code: "id-ID",
    label: "Indonesian",
    flag: "🇮🇩",
    placeholder: "Ketik pesan...",
  },
  { code: "th-TH", label: "Thai", flag: "🇹🇭", placeholder: "พิมพ์ข้อความ..." },
];

const COUNTRIES: { flag: string; name: string }[] = [
  { flag: "🇺🇸", name: "United States" },
  { flag: "🇬🇧", name: "United Kingdom" },
  { flag: "🇮🇳", name: "India" },
  { flag: "🇧🇷", name: "Brazil" },
  { flag: "🇩🇪", name: "Germany" },
  { flag: "🇫🇷", name: "France" },
  { flag: "🇯🇵", name: "Japan" },
  { flag: "🇰🇷", name: "South Korea" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇷🇺", name: "Russia" },
  { flag: "🇲🇽", name: "Mexico" },
  { flag: "🇮🇩", name: "Indonesia" },
  { flag: "🇹🇷", name: "Turkey" },
  { flag: "🇸🇦", name: "Saudi Arabia" },
  { flag: "🇳🇬", name: "Nigeria" },
  { flag: "🇵🇰", name: "Pakistan" },
  { flag: "🇵🇭", name: "Philippines" },
  { flag: "🇪🇬", name: "Egypt" },
  { flag: "🇹🇭", name: "Thailand" },
  { flag: "🇦🇷", name: "Argentina" },
  { flag: "🇨🇴", name: "Colombia" },
  { flag: "🇨🇱", name: "Chile" },
  { flag: "🇵🇪", name: "Peru" },
  { flag: "🇻🇳", name: "Vietnam" },
  { flag: "🇲🇾", name: "Malaysia" },
  { flag: "🇸🇬", name: "Singapore" },
  { flag: "🇹🇼", name: "Taiwan" },
  { flag: "🇭🇰", name: "Hong Kong" },
  { flag: "🇨🇳", name: "China" },
  { flag: "🇮🇷", name: "Iran" },
  { flag: "🇮🇶", name: "Iraq" },
  { flag: "🇿🇦", name: "South Africa" },
  { flag: "🇰🇪", name: "Kenya" },
  { flag: "🇬🇭", name: "Ghana" },
  { flag: "🇪🇹", name: "Ethiopia" },
  { flag: "🇹🇿", name: "Tanzania" },
  { flag: "🇺🇬", name: "Uganda" },
  { flag: "🇳🇱", name: "Netherlands" },
  { flag: "🇧🇪", name: "Belgium" },
  { flag: "🇸🇪", name: "Sweden" },
  { flag: "🇳🇴", name: "Norway" },
  { flag: "🇩🇰", name: "Denmark" },
  { flag: "🇫🇮", name: "Finland" },
  { flag: "🇵🇱", name: "Poland" },
  { flag: "🇺🇦", name: "Ukraine" },
  { flag: "🇨🇿", name: "Czech Republic" },
  { flag: "🇷🇴", name: "Romania" },
  { flag: "🇬🇷", name: "Greece" },
  { flag: "🇵🇹", name: "Portugal" },
  { flag: "🇮🇱", name: "Israel" },
  { flag: "🇦🇪", name: "UAE" },
  { flag: "🇳🇿", name: "New Zealand" },
  { flag: "🇮🇹", name: "Italy" },
  { flag: "🇪🇸", name: "Spain" },
  { flag: "🇦🇹", name: "Austria" },
  { flag: "🇨🇭", name: "Switzerland" },
  { flag: "🇧🇩", name: "Bangladesh" },
  { flag: "🇱🇰", name: "Sri Lanka" },
  { flag: "🇳🇵", name: "Nepal" },
];

const LOCALE_COUNTRY_MAP: Record<string, { flag: string; name: string }> = {
  "en-US": { flag: "🇺🇸", name: "United States" },
  "en-GB": { flag: "🇬🇧", name: "United Kingdom" },
  "en-AU": { flag: "🇦🇺", name: "Australia" },
  "en-CA": { flag: "🇨🇦", name: "Canada" },
  hi: { flag: "🇮🇳", name: "India" },
  "hi-IN": { flag: "🇮🇳", name: "India" },
  gu: { flag: "🇮🇳", name: "India" },
  "gu-IN": { flag: "🇮🇳", name: "India" },
  "pt-BR": { flag: "🇧🇷", name: "Brazil" },
  de: { flag: "🇩🇪", name: "Germany" },
  "de-DE": { flag: "🇩🇪", name: "Germany" },
  fr: { flag: "🇫🇷", name: "France" },
  "fr-FR": { flag: "🇫🇷", name: "France" },
  ja: { flag: "🇯🇵", name: "Japan" },
  "ja-JP": { flag: "🇯🇵", name: "Japan" },
  ko: { flag: "🇰🇷", name: "South Korea" },
  "ko-KR": { flag: "🇰🇷", name: "South Korea" },
  ru: { flag: "🇷🇺", name: "Russia" },
  "ru-RU": { flag: "🇷🇺", name: "Russia" },
  "es-MX": { flag: "🇲🇽", name: "Mexico" },
  id: { flag: "🇮🇩", name: "Indonesia" },
  tr: { flag: "🇹🇷", name: "Turkey" },
  ar: { flag: "🇸🇦", name: "Saudi Arabia" },
  "ar-SA": { flag: "🇸🇦", name: "Saudi Arabia" },
  th: { flag: "🇹🇭", name: "Thailand" },
};

const CONTINENT_LABELS = [
  "🌎 Americas",
  "🌍 Africa",
  "🌏 Asia",
  "🌐 Europe",
  "🗺️ Oceania",
  "🏔️ Middle East",
];

const AUTO_REPLIES = [
  "Hello!",
  "How are you?",
  "Where are you from?",
  "Nice to meet you!",
  "asl?",
  "hi there!",
  "What's up?",
  "Cool!",
  "Really? 😮",
  "haha lol",
  "नमस्ते!",
  "कैसे हो?",
  "kem cho?",
  "Kya chal raha hai?",
  // Gujarati
  "કેમ છો?",
  "ઠીક છું!",
  "ક્યાંથી છો?",
  "મળીને ખૂબ ખુશી થઈ!",
  // Spanish
  "¡Hola!",
  "¿Cómo estás?",
  "¿De dónde eres?",
  "¡Mucho gusto!",
  // French
  "Bonjour!",
  "Comment ça va?",
  "D'où venez-vous?",
  "Enchanté!",
  // Arabic
  "مرحبا!",
  "كيف حالك؟",
  "من أين أنت؟",
  // Russian
  "Привет!",
  "Как дела?",
  // Japanese
  "こんにちは！",
  "お元気ですか？",
  // Korean
  "안녕하세요!",
  "잘 지내세요?",
  // Portuguese
  "Olá!",
  "Como vai?",
  // Turkish
  "Merhaba!",
  "Nasılsın?",
];

declare global {
  interface Window {
    SpeechRecognition: new () => any;
    webkitSpeechRecognition: new () => any;
  }
}

function detectUserCountry(): { flag: string; name: string } {
  const lang = navigator.language;
  if (LOCALE_COUNTRY_MAP[lang]) return LOCALE_COUNTRY_MAP[lang];
  const prefix = lang.split("-")[0];
  const match = Object.entries(LOCALE_COUNTRY_MAP).find(([k]) => k === prefix);
  if (match) return match[1];
  return { flag: "🌐", name: "Unknown" };
}

function randomOnlineCount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomStranger(
  world: WorldRoom,
  ageFilter?: { min: number; max: number },
  countryFilter?: string,
): StrangerProfile {
  let c: { flag: string; name: string };
  if (countryFilter && countryFilter !== "All" && Math.random() < 0.75) {
    c =
      COUNTRIES.find((x) => x.name === countryFilter) ??
      COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  } else {
    c = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  }
  let age: number;
  if (ageFilter && ageFilter.min > 0 && Math.random() < 0.75) {
    const ageMin = ageFilter.min;
    const ageMax = Math.min(ageFilter.max, 65);
    age = ageMin + Math.floor(Math.random() * (ageMax - ageMin + 1));
  } else {
    age = 18 + Math.floor(Math.random() * 18);
  }
  return { country: c.name, flag: c.flag, age, world };
}

function randomWorldwideCount(): number {
  return Math.floor(Math.random() * (50000 - 12000 + 1)) + 12000;
}

const AGE_RANGES = [
  { label: "Any", min: 0, max: 999 },
  { label: "18–25", min: 18, max: 25 },
  { label: "26–35", min: 26, max: 35 },
  { label: "36–50", min: 36, max: 50 },
  { label: "50+", min: 50, max: 999 },
];

const WorldOnlineCounts = WORLD_ROOMS.map((w) => ({
  id: w.id,
  count: randomOnlineCount(w.onlineMin, w.onlineMax),
}));

export default function OmegleChat({ open, onClose }: OmegleChatProps) {
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [deniedReason, setDeniedReason] = useState<
    "blocked" | "notfound" | "other" | null
  >(null);
  const [step, setStep] = useState<AppStep>("permission");
  const [selectedWorld, setSelectedWorld] = useState<WorldRoom>(WORLD_ROOMS[0]);
  const [worldwidePeople] = useState(() => randomWorldwideCount());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [selectedLang, setSelectedLang] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [strangerProfile, setStrangerProfile] =
    useState<StrangerProfile | null>(null);
  const [myCountry] = useState(() => detectUserCountry());
  const [myAge] = useState(() => 18 + Math.floor(Math.random() * 13));
  const [continentIndex, setContinentIndex] = useState(0);
  const [ageFilterIndex, setAgeFilterIndex] = useState(0);
  const [countryFilter, setCountryFilter] = useState("All");

  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const strangerVideoRef = useRef<HTMLVideoElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const connectedRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasSpeechSupport(!!SpeechAPI);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  }, []);

  const connectStranger = useCallback(
    (world?: WorldRoom) => {
      const targetWorld = world ?? selectedWorld;
      setConnected(false);
      connectedRef.current = false;
      setConnecting(true);
      setMessages([]);
      setStrangerProfile(null);
      if (strangerVideoRef.current) strangerVideoRef.current.srcObject = null;
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      // Cycle continent labels during connecting
      if (continentTimerRef.current) clearInterval(continentTimerRef.current);
      continentTimerRef.current = setInterval(() => {
        setContinentIndex((prev) => (prev + 1) % CONTINENT_LABELS.length);
      }, 600);
      const delay = 2000 + Math.random() * 1500;
      connectTimerRef.current = setTimeout(() => {
        if (continentTimerRef.current) clearInterval(continentTimerRef.current);
        setConnecting(false);
        setConnected(true);
        connectedRef.current = true;
        setStrangerProfile(
          randomStranger(
            targetWorld,
            ageFilterIndex > 0 ? AGE_RANGES[ageFilterIndex] : undefined,
            countryFilter !== "All" ? countryFilter : undefined,
          ),
        );
        if (strangerVideoRef.current && streamRef.current) {
          strangerVideoRef.current.srcObject = streamRef.current;
        }
      }, delay);
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: filters read inside timeout
    [selectedWorld, ageFilterIndex, countryFilter],
  );

  const requestPermission = useCallback(async () => {
    setPermission("requesting");
    setDeniedReason(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setPermission("granted");
      setStep("world-select");
    } catch (err: any) {
      const name = err?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setDeniedReason("blocked");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setDeniedReason("notfound");
      } else {
        setDeniedReason("other");
      }
      setPermission("denied");
    }
  }, []);

  const startChat = useCallback(() => {
    setStep("chat");
    connectStranger(selectedWorld);
  }, [connectStranger, selectedWorld]);

  useEffect(() => {
    if (open) {
      setPermission("requesting");
      setStep("permission");
      setConnected(false);
      setConnecting(false);
      setMessages([]);
      setStrangerProfile(null);
      // Auto-request camera & mic on open
      // First check if already denied
      const checkAndRequest = async () => {
        try {
          if (navigator.permissions) {
            const camPerm = await navigator.permissions.query({
              name: "camera" as PermissionName,
            });
            if (camPerm.state === "denied") {
              setPermission("denied");
              setDeniedReason("blocked");
              return;
            }
          }
        } catch {
          // permissions API not supported, continue
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          streamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          setPermission("granted");
          setStep("world-select");
        } catch (err: any) {
          const name = err?.name ?? "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            setDeniedReason("blocked");
          } else if (
            name === "NotFoundError" ||
            name === "DevicesNotFoundError"
          ) {
            setDeniedReason("notfound");
          } else {
            setDeniedReason("other");
          }
          setPermission("denied");
        }
      };
      checkAndRequest();
    } else {
      stopCamera();
      setPermission("idle");
      setStep("permission");
      setConnected(false);
      setConnecting(false);
      setMessages([]);
      setStrangerProfile(null);
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      if (continentTimerRef.current) clearInterval(continentTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
    return () => {
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      if (continentTimerRef.current) clearInterval(continentTimerRef.current);
    };
  }, [open, stopCamera]);

  useEffect(() => {
    if (
      permission === "granted" &&
      localVideoRef.current &&
      streamRef.current
    ) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [permission]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll only
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleCamera = () => {
    if (!streamRef.current) return;
    for (const t of streamRef.current.getVideoTracks()) t.enabled = !cameraOn;
    setCameraOn(!cameraOn);
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    for (const t of streamRef.current.getAudioTracks()) t.enabled = !micOn;
    setMicOn(!micOn);
  };

  const startVoiceInput = () => {
    const SpeechAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new SpeechAPI();
    recognition.lang = LANGUAGES[selectedLang].code;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setChatInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      { from: "You", text: chatInput.trim(), ts: Date.now() },
    ]);
    setChatInput("");
    if (connectedRef.current) {
      replyTimerRef.current = setTimeout(
        () => {
          const reply =
            AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
          setMessages((prev) => [
            ...prev,
            { from: "Stranger", text: reply, ts: Date.now() },
          ]);
        },
        1500 + Math.random() * 1000,
      );
    }
  };

  const reportUser = () => {
    toast.success(
      "Report submitted. Thank you for keeping the community safe! 🛡️",
    );
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        style={{
          background: "rgba(5,5,16,0.98)",
          backdropFilter: "blur(16px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* ── Permission Screen ── */}
        <AnimatePresence>
          {step === "permission" && (
            <motion.div
              key="permission"
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #050510 0%, #0d0d2b 50%, #1a0530 100%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full transition-all hover:scale-110"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <X size={18} />
              </button>

              <motion.div
                className="text-center px-8 max-w-sm w-full"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Safe Zone Badge */}
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 text-sm font-semibold"
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid rgba(34,197,94,0.4)",
                    color: "#86efac",
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Shield size={14} />
                  Safe Chat Zone
                </motion.div>

                <motion.div
                  className="mx-auto mb-4 w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(120,40,255,0.15)",
                    border: "2px solid rgba(200,100,255,0.4)",
                    boxShadow:
                      "0 0 40px rgba(160,80,255,0.3), inset 0 0 40px rgba(120,40,255,0.1)",
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 40px rgba(160,80,255,0.3)",
                      "0 0 60px rgba(200,100,255,0.5)",
                      "0 0 40px rgba(160,80,255,0.3)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <span className="text-4xl">🎥</span>
                </motion.div>

                {permission === "denied" ? (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-3">
                      {deniedReason === "blocked"
                        ? "Access Blocked"
                        : deniedReason === "notfound"
                          ? "No Device Found"
                          : "Permission Denied"}
                    </h2>
                    {deniedReason === "blocked" ? (
                      <div className="text-left mb-5 w-full">
                        <p
                          className="text-sm mb-3"
                          style={{ color: "rgba(255,200,100,0.9)" }}
                        >
                          Your browser has blocked camera &amp; microphone
                          access. Follow these steps:
                        </p>
                        <ol
                          className="text-sm space-y-2"
                          style={{ color: "rgba(255,255,255,0.75)" }}
                        >
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 font-bold">
                              1.
                            </span>{" "}
                            Click the <strong>🔒 lock or camera icon</strong> in
                            your browser's address bar
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 font-bold">
                              2.
                            </span>{" "}
                            Set Camera and Microphone to <strong>Allow</strong>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-purple-400 font-bold">
                              3.
                            </span>{" "}
                            <strong>Refresh this page</strong> and open Omegle
                            again
                          </li>
                        </ol>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            data-ocid="omegle.primary_button"
                            onClick={() => window.location.reload()}
                            className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95"
                            style={{
                              background:
                                "linear-gradient(135deg, #7c3aed, #a855f7)",
                              boxShadow: "0 0 20px rgba(168,85,247,0.4)",
                            }}
                          >
                            🔄 Refresh Page
                          </button>
                          <button
                            type="button"
                            data-ocid="omegle.secondary_button"
                            onClick={requestPermission}
                            className="flex-1 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
                            style={{
                              background: "rgba(255,255,255,0.1)",
                              color: "rgba(255,255,255,0.8)",
                              border: "1px solid rgba(255,255,255,0.2)",
                            }}
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    ) : deniedReason === "notfound" ? (
                      <>
                        <p
                          className="text-sm mb-6"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          No camera or microphone was found. Please connect a
                          device and try again.
                        </p>
                        <button
                          type="button"
                          data-ocid="omegle.allow_button"
                          onClick={requestPermission}
                          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95"
                          style={{
                            background:
                              "linear-gradient(135deg, #7c3aed, #a855f7)",
                            boxShadow: "0 0 25px rgba(168,85,247,0.4)",
                          }}
                        >
                          🔄 Retry
                        </button>
                      </>
                    ) : (
                      <>
                        <p
                          className="text-sm mb-6"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          Camera and microphone access was denied. Please allow
                          access and try again.
                        </p>
                        <button
                          type="button"
                          data-ocid="omegle.allow_button"
                          onClick={requestPermission}
                          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95"
                          style={{
                            background:
                              "linear-gradient(135deg, #7c3aed, #a855f7)",
                            boxShadow: "0 0 25px rgba(168,85,247,0.4)",
                          }}
                        >
                          🔄 Retry
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Omegle Worlds
                    </h2>
                    <p
                      className="text-sm mb-1"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      Chat with real people worldwide — face to face.
                    </p>

                    {/* Safety notice */}
                    <div
                      className="mt-3 mb-4 px-4 py-3 rounded-xl text-left text-xs"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "rgba(255,180,180,0.9)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <Shield size={11} /> Community Policy
                      </div>
                      Nudity & inappropriate content is strictly prohibited and
                      will result in an immediate ban.
                    </div>

                    <div
                      className="flex justify-center gap-4 mb-5 text-sm"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <span>📷 Camera</span>
                      <span>🎤 Microphone</span>
                    </div>

                    <motion.button
                      type="button"
                      data-ocid="omegle.allow_button"
                      onClick={requestPermission}
                      disabled={permission === "requesting"}
                      className="w-full py-3 rounded-xl font-semibold text-white transition-all"
                      style={{
                        background:
                          permission === "requesting"
                            ? "rgba(120,40,255,0.4)"
                            : "linear-gradient(135deg, #7c3aed, #a855f7)",
                        boxShadow: "0 0 25px rgba(168,85,247,0.4)",
                        cursor:
                          permission === "requesting"
                            ? "not-allowed"
                            : "pointer",
                      }}
                      whileHover={
                        permission !== "requesting" ? { scale: 1.03 } : {}
                      }
                      whileTap={
                        permission !== "requesting" ? { scale: 0.97 } : {}
                      }
                    >
                      {permission === "requesting" ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.div
                            className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                          />
                          Requesting...
                        </span>
                      ) : (
                        "🎬 Allow Camera & Start"
                      )}
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── World Selection Screen ── */}
        <AnimatePresence>
          {step === "world-select" && (
            <motion.div
              key="world-select"
              className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto py-8"
              style={{
                background:
                  "linear-gradient(135deg, #050510 0%, #0d0d2b 60%, #1a0530 100%)",
              }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full transition-all hover:scale-110"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <X size={18} />
              </button>

              <motion.div
                className="w-full max-w-md px-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    🌍 Choose Your World
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    Pick a world to find like-minded strangers
                  </p>
                  {/* Worldwide count */}
                  <motion.div
                    className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(0,200,150,0.12)",
                      border: "1px solid rgba(0,200,150,0.3)",
                      color: "#6ee7b7",
                    }}
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    {worldwidePeople.toLocaleString()} people online worldwide
                  </motion.div>
                </div>

                <div className="space-y-2.5">
                  {WORLD_ROOMS.map((world, i) => {
                    const onlineCount =
                      WorldOnlineCounts.find((w) => w.id === world.id)?.count ??
                      0;
                    const isSelected = selectedWorld.id === world.id;
                    return (
                      <motion.button
                        key={world.id}
                        type="button"
                        data-ocid="omegle.world_select"
                        onClick={() => setSelectedWorld(world)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: isSelected
                            ? "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(168,85,247,0.25))"
                            : "rgba(255,255,255,0.04)",
                          border: isSelected
                            ? "1px solid rgba(168,85,247,0.6)"
                            : "1px solid rgba(255,255,255,0.08)",
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-2xl flex-shrink-0">
                          {world.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">
                              {world.label}
                            </span>
                            {isSelected && (
                              <motion.span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  background: "rgba(168,85,247,0.4)",
                                  color: "#c4b5fd",
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                Selected
                              </motion.span>
                            )}
                          </div>
                          <p
                            className="text-xs truncate"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {world.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div
                            className="text-xs font-semibold"
                            style={{ color: "#a78bfa" }}
                          >
                            {onlineCount}
                          </div>
                          <div
                            className="text-[9px]"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            online
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Age & Country Filters */}
                <div className="mt-5 space-y-3">
                  <div>
                    <p
                      className="text-xs font-semibold mb-2"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      🎂 Age Range
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {AGE_RANGES.map((range, i) => (
                        <button
                          key={range.label}
                          type="button"
                          data-ocid="omegle.age_filter.toggle"
                          onClick={() => setAgeFilterIndex(i)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                          style={{
                            background:
                              ageFilterIndex === i
                                ? "linear-gradient(135deg, rgba(236,72,153,0.5), rgba(168,85,247,0.45))"
                                : "rgba(255,255,255,0.06)",
                            border:
                              ageFilterIndex === i
                                ? "1px solid rgba(236,72,153,0.7)"
                                : "1px solid rgba(255,255,255,0.1)",
                            color:
                              ageFilterIndex === i
                                ? "#f9a8d4"
                                : "rgba(255,255,255,0.45)",
                            boxShadow:
                              ageFilterIndex === i
                                ? "0 0 10px rgba(236,72,153,0.25)"
                                : "none",
                          }}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold mb-2"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      🌍 Country
                    </p>
                    <div className="relative">
                      <select
                        data-ocid="omegle.country_filter.select"
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none appearance-none cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border:
                            countryFilter !== "All"
                              ? "1px solid rgba(236,72,153,0.6)"
                              : "1px solid rgba(255,255,255,0.12)",
                          color:
                            countryFilter !== "All"
                              ? "#f9a8d4"
                              : "rgba(255,255,255,0.55)",
                          boxShadow:
                            countryFilter !== "All"
                              ? "0 0 10px rgba(236,72,153,0.2)"
                              : "none",
                        }}
                      >
                        <option value="All" style={{ background: "#0d0d2b" }}>
                          🌍 All Countries
                        </option>
                        {COUNTRIES.map((c) => (
                          <option
                            key={c.name}
                            value={c.name}
                            style={{ background: "#0d0d2b" }}
                          >
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(ageFilterIndex > 0 || countryFilter !== "All") && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Active:
                      </span>
                      {ageFilterIndex > 0 && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: "rgba(236,72,153,0.25)",
                            border: "1px solid rgba(236,72,153,0.45)",
                            color: "#f9a8d4",
                          }}
                        >
                          🎂 {AGE_RANGES[ageFilterIndex].label}
                        </span>
                      )}
                      {countryFilter !== "All" && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: "rgba(99,102,241,0.25)",
                            border: "1px solid rgba(99,102,241,0.45)",
                            color: "#a5b4fc",
                          }}
                        >
                          {
                            COUNTRIES.find((c) => c.name === countryFilter)
                              ?.flag
                          }{" "}
                          {countryFilter}
                        </span>
                      )}
                      <button
                        type="button"
                        data-ocid="omegle.clear_filters_button"
                        onClick={() => {
                          setAgeFilterIndex(0);
                          setCountryFilter("All");
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] transition-all hover:scale-105"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        ✕ Clear
                      </button>
                    </div>
                  )}
                </div>

                <motion.button
                  type="button"
                  data-ocid="omegle.start_chat_button"
                  onClick={startChat}
                  className="w-full mt-5 py-3.5 rounded-xl font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: "0 0 30px rgba(168,85,247,0.45)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {selectedWorld.emoji} Enter {selectedWorld.label} World
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Chat UI ── */}
        {step === "chat" && (
          <motion.div
            className="flex flex-col md:flex-row w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Video Section */}
            <div className="flex-1 relative flex flex-col">
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0 gap-2"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(10,10,30,0.95), rgba(20,5,40,0.95))",
                  borderBottom: "1px solid rgba(200,100,255,0.2)",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">🎥</span>
                  <span
                    className="font-bold text-white tracking-wide flex-shrink-0"
                    style={{
                      textShadow: "0 0 15px rgba(200,100,255,0.7)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Omegle
                  </span>
                  {/* World badge in header */}
                  <span
                    className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(120,40,255,0.25)",
                      border: "1px solid rgba(168,85,247,0.35)",
                      color: "#c4b5fd",
                    }}
                  >
                    {selectedWorld.emoji} {selectedWorld.label}
                  </span>
                  {/* Safe zone badge in header */}
                  <span
                    className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{
                      background: "rgba(34,197,94,0.12)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      color: "#86efac",
                    }}
                  >
                    <Shield size={9} /> Safe Zone
                  </span>
                  <AnimatePresence mode="wait">
                    {connected && (
                      <motion.span
                        key="connected"
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: "rgba(34,197,94,0.2)",
                          color: "#86efac",
                          border: "1px solid rgba(34,197,94,0.3)",
                        }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        🟢 Connected
                      </motion.span>
                    )}
                    {connecting && (
                      <motion.span
                        key="connecting"
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: "rgba(234,179,8,0.2)",
                          color: "#fde047",
                          border: "1px solid rgba(234,179,8,0.3)",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{
                          duration: 1.2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                        exit={{ opacity: 0 }}
                      >
                        🌍 Searching...
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {connected && (
                    <button
                      type="button"
                      data-ocid="omegle.report_button"
                      onClick={reportUser}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#fca5a5",
                      }}
                    >
                      <Flag size={11} /> Report
                    </button>
                  )}
                  {/* Active filter badges */}
                  {(ageFilterIndex > 0 || countryFilter !== "All") && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ageFilterIndex > 0 && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{
                            background: "rgba(236,72,153,0.25)",
                            border: "1px solid rgba(236,72,153,0.4)",
                            color: "#f9a8d4",
                          }}
                        >
                          {AGE_RANGES[ageFilterIndex].label}
                        </span>
                      )}
                      {countryFilter !== "All" && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{
                            background: "rgba(99,102,241,0.25)",
                            border: "1px solid rgba(99,102,241,0.4)",
                            color: "#a5b4fc",
                          }}
                        >
                          {
                            COUNTRIES.find((c) => c.name === countryFilter)
                              ?.flag
                          }
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    data-ocid="omegle.next_button"
                    onClick={() => connectStranger()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))",
                      border: "1px solid rgba(168,85,247,0.4)",
                      color: "#c4b5fd",
                    }}
                  >
                    <SkipForward size={14} /> Next
                  </button>
                  <button
                    type="button"
                    data-ocid="omegle.stop_button"
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.35)",
                      color: "#fca5a5",
                    }}
                  >
                    <Square size={12} /> Stop
                  </button>
                </div>
              </div>

              {/* Video Area */}
              <div
                className="flex-1 relative flex flex-col"
                style={{ background: "#050510" }}
              >
                {/* Stranger Video */}
                <div className="flex-1 relative overflow-hidden">
                  {connecting && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center z-10"
                      style={{
                        background:
                          "linear-gradient(135deg, #0d0d2b, #1a0530, #0a1540)",
                      }}
                    >
                      {/* Pulsing globe */}
                      <motion.div
                        className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center relative"
                        style={{
                          border: "2px solid rgba(200,100,255,0.5)",
                          background: "rgba(120,40,255,0.1)",
                        }}
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 3,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                      >
                        <span className="text-4xl">🌍</span>
                        {/* Orbiting dot */}
                        <motion.div
                          className="absolute w-3 h-3 rounded-full"
                          style={{
                            background: "rgba(200,100,255,0.9)",
                            top: "-6px",
                            left: "50%",
                            marginLeft: "-6px",
                            boxShadow: "0 0 8px rgba(200,100,255,0.9)",
                          }}
                        />
                      </motion.div>

                      {/* Worldwide count */}
                      <motion.div
                        className="mb-3 text-sm font-semibold"
                        style={{ color: "rgba(200,150,255,0.9)" }}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      >
                        🌐 {worldwidePeople.toLocaleString()} people online
                        worldwide
                      </motion.div>

                      {/* Cycling continent labels */}
                      <motion.div
                        key={continentIndex}
                        className="mb-2 text-base font-bold tracking-widest"
                        style={{ color: "rgba(160,100,255,0.85)" }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        {CONTINENT_LABELS[continentIndex]}
                      </motion.div>

                      <p className="text-white/50 text-xs font-medium mb-1">
                        Searching in {selectedWorld.emoji} {selectedWorld.label}{" "}
                        World...
                      </p>

                      {/* Pulsing dots */}
                      <div className="flex gap-1.5 mt-3">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full"
                            style={{ background: "rgba(200,100,255,0.7)" }}
                            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{
                              duration: 0.8,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {connected && (
                    <>
                      <motion.div
                        className="absolute inset-0 z-10 pointer-events-none"
                        style={{
                          boxShadow: "inset 0 0 0 3px rgba(0,255,150,0.4)",
                        }}
                        animate={{
                          boxShadow: [
                            "inset 0 0 0 2px rgba(0,255,150,0.3)",
                            "inset 0 0 0 3px rgba(0,255,200,0.7)",
                            "inset 0 0 0 2px rgba(0,255,150,0.3)",
                          ],
                        }}
                        transition={{
                          duration: 1.8,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                      <video
                        ref={strangerVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ filter: "hue-rotate(15deg) saturate(1.1)" }}
                      />

                      {/* Stranger label */}
                      <div
                        className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(34,197,94,0.5)",
                          color: "#86efac",
                        }}
                      >
                        <motion.div
                          className="w-2 h-2 rounded-full bg-green-400"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        />
                        Stranger
                      </div>

                      {/* Stranger profile + world badge */}
                      <AnimatePresence>
                        {strangerProfile && (
                          <motion.div
                            data-ocid="omegle.stranger_location"
                            className="absolute top-3 right-3 z-20 flex flex-col gap-1 items-end"
                            initial={{ opacity: 0, y: -8, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.92 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                          >
                            {/* Country + age */}
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                              style={{
                                background: "rgba(5,5,20,0.65)",
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "rgba(255,255,255,0.92)",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                              }}
                            >
                              <span className="text-base leading-none">
                                {strangerProfile.flag}
                              </span>
                              <span style={{ color: "rgba(255,255,255,0.85)" }}>
                                {strangerProfile.country}
                              </span>
                              <span
                                style={{
                                  color: "rgba(255,255,255,0.35)",
                                  fontSize: "0.6rem",
                                }}
                              >
                                •
                              </span>
                              <span style={{ color: "#c4b5fd" }}>
                                Age: {strangerProfile.age}
                              </span>
                            </div>
                            {/* World badge */}
                            <div
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
                              style={{
                                background: "rgba(120,40,255,0.45)",
                                backdropFilter: "blur(8px)",
                                border: "1px solid rgba(168,85,247,0.5)",
                                color: "#e9d5ff",
                              }}
                            >
                              {strangerProfile.world.emoji}{" "}
                              {strangerProfile.world.label}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}

                  {!connecting && !connected && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #0d0d2b, #1a0530)",
                      }}
                    >
                      <p className="text-white/30 text-sm">
                        Waiting to connect...
                      </p>
                    </div>
                  )}
                </div>

                {/* Local video PiP */}
                <motion.div
                  className="absolute bottom-20 right-3 rounded-xl overflow-hidden z-20"
                  style={{
                    width: "130px",
                    height: "98px",
                    border: "2px solid rgba(168,85,247,0.6)",
                    boxShadow: "0 0 20px rgba(160,80,255,0.3)",
                    background: "#000",
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  {!cameraOn && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.8)" }}
                    >
                      <CameraOff
                        size={20}
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      />
                    </div>
                  )}
                  <div
                    className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    You
                  </div>
                  <div
                    className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-medium"
                    style={{
                      background: "rgba(5,5,20,0.7)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.8)",
                      maxWidth: "120px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span>{myCountry.flag}</span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "70px",
                      }}
                    >
                      {myCountry.name}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                    <span style={{ color: "#c4b5fd" }}>{myAge}</span>
                  </div>
                </motion.div>

                {/* Camera & Mic controls */}
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 z-20">
                  <button
                    type="button"
                    data-ocid="omegle.camera_toggle"
                    onClick={toggleCamera}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: cameraOn
                        ? "rgba(120,40,255,0.4)"
                        : "rgba(239,68,68,0.4)",
                      border: `1px solid ${cameraOn ? "rgba(168,85,247,0.6)" : "rgba(239,68,68,0.6)"}`,
                      backdropFilter: "blur(8px)",
                      color: "white",
                    }}
                    title={cameraOn ? "Turn off camera" : "Turn on camera"}
                  >
                    {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
                  </button>
                  <button
                    type="button"
                    data-ocid="omegle.mic_toggle"
                    onClick={toggleMic}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: micOn
                        ? "rgba(120,40,255,0.4)"
                        : "rgba(239,68,68,0.4)",
                      border: `1px solid ${micOn ? "rgba(168,85,247,0.6)" : "rgba(239,68,68,0.6)"}`,
                      backdropFilter: "blur(8px)",
                      color: "white",
                    }}
                    title={micOn ? "Mute mic" : "Unmute mic"}
                  >
                    {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Chat Panel ── */}
            <div
              className="flex flex-col w-full md:w-80 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(8,5,20,0.98), rgba(12,5,30,0.98))",
                borderLeft: "1px solid rgba(200,100,255,0.15)",
                maxHeight: "100vh",
              }}
            >
              {/* Chat header */}
              <div
                className="px-4 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(200,100,255,0.12)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-white/80">💬 Chat</p>
                  {connected && strangerProfile && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(120,40,255,0.25)",
                        border: "1px solid rgba(168,85,247,0.35)",
                        color: "#c4b5fd",
                      }}
                    >
                      {strangerProfile.world.emoji}{" "}
                      {strangerProfile.world.label}
                    </span>
                  )}
                </div>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {connected && strangerProfile
                    ? `${strangerProfile.flag} ${strangerProfile.country} · Age ${strangerProfile.age}`
                    : connecting
                      ? `Searching in ${selectedWorld.label}... 🌍`
                      : "Not connected"}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <motion.p
                    className="text-xs text-center mt-6"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    No messages yet. Say hello! 👋
                  </motion.p>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      // biome-ignore lint/suspicious/noArrayIndexKey: append-only list
                      key={i}
                      className={`flex ${msg.from === "You" ? "justify-end" : "justify-start"}`}
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <div
                        className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                        style={{
                          background:
                            msg.from === "You"
                              ? "linear-gradient(135deg, rgba(124,58,237,0.55), rgba(168,85,247,0.45))"
                              : "rgba(255,255,255,0.07)",
                          border:
                            msg.from === "You"
                              ? "1px solid rgba(168,85,247,0.35)"
                              : "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.92)",
                          borderRadius:
                            msg.from === "You"
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                        }}
                      >
                        <span
                          className="block font-semibold text-[10px] mb-0.5"
                          style={{
                            color: msg.from === "You" ? "#c4b5fd" : "#93c5fd",
                          }}
                        >
                          {msg.from}
                        </span>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={msgEndRef} />
              </div>

              {/* Language selector */}
              <div
                className="px-3 pt-2 flex gap-1.5 flex-wrap flex-shrink-0 max-h-24 overflow-y-auto"
                style={{ borderTop: "1px solid rgba(200,100,255,0.1)" }}
              >
                {LANGUAGES.map((lang, i) => (
                  <button
                    key={lang.label}
                    type="button"
                    data-ocid="omegle.language_select"
                    onClick={() => setSelectedLang(i)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-105 mb-1"
                    style={{
                      background:
                        selectedLang === i
                          ? "rgba(168,85,247,0.35)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        selectedLang === i
                          ? "1px solid rgba(168,85,247,0.6)"
                          : "1px solid rgba(255,255,255,0.1)",
                      color:
                        selectedLang === i
                          ? "#c4b5fd"
                          : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {lang.flag} {lang.label}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 flex gap-2 items-center flex-shrink-0">
                {hasSpeechSupport && (
                  <button
                    type="button"
                    data-ocid="omegle.mic_input_button"
                    onClick={startVoiceInput}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                    style={{
                      background: isListening
                        ? "rgba(239,68,68,0.4)"
                        : "rgba(255,255,255,0.07)",
                      border: isListening
                        ? "1px solid rgba(239,68,68,0.7)"
                        : "1px solid rgba(255,255,255,0.15)",
                      color: isListening ? "#fca5a5" : "rgba(255,255,255,0.5)",
                      boxShadow: isListening
                        ? "0 0 12px rgba(239,68,68,0.3)"
                        : "none",
                    }}
                    title={
                      isListening
                        ? "Stop recording"
                        : `Voice input (${LANGUAGES[selectedLang].label})`
                    }
                  >
                    {isListening ? (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{
                          duration: 0.8,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      >
                        <Mic size={14} />
                      </motion.div>
                    ) : (
                      <Mic size={14} />
                    )}
                  </button>
                )}
                <input
                  data-ocid="omegle.chat_input"
                  type="text"
                  placeholder={LANGUAGES[selectedLang].placeholder}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none min-w-0"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(200,100,255,0.2)",
                    color: "white",
                  }}
                />
                <button
                  type="button"
                  data-ocid="omegle.send_button"
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    color: "white",
                    boxShadow: "0 0 12px rgba(168,85,247,0.35)",
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
