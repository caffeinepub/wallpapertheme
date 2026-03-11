import {
  Camera,
  CameraOff,
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
import Peer, { type MediaConnection } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";

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

type ChatState = "idle" | "searching" | "connected" | "error";

interface Message {
  id: string;
  from: "me" | "stranger" | "system";
  text: string;
  ts: number;
}

function playConnectTone() {
  try {
    const ctx = new AudioContext();
    const notes = [261.63, 329.63, 392.0, 523.25];
    for (const [i, freq] of notes.entries()) {
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
    }
    setTimeout(() => ctx.close(), 1500);
  } catch (_) {}
}

export default function OmegleChat({ open, onClose }: OmegleChatProps) {
  const [state, setState] = useState<ChatState>("idle");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [userCountry, setUserCountry] = useState("India");
  const [userAge, setUserAge] = useState(22);
  const [language, setLanguage] = useState("en");
  const [strangerInfo, setStrangerInfo] = useState<{
    country: string;
    age: number;
  } | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [ripple, setRipple] = useState(false);
  const [permError, setPermError] = useState("");
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [camReady, setCamReady] = useState(false);

  const { actor } = useActor();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const sidRef = useRef<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dataConnRef = useRef<ReturnType<Peer["connect"]> | null>(null);

  // ── Helpers (must be defined before useEffects that use them) ──────────────
  const addSystemMsg = useCallback((text: string) => {
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "system", text, ts: Date.now() },
    ]);
  }, []);

  const cleanup = useCallback(
    (stopStream = false) => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      if (sidRef.current) {
        try {
          (actor as any).leaveOmegleQueue(sidRef.current);
        } catch (_) {}
        sidRef.current = "";
      }
      if (callRef.current) {
        try {
          callRef.current.close();
        } catch (_) {}
        callRef.current = null;
      }
      if (dataConnRef.current) {
        try {
          dataConnRef.current.close();
        } catch (_) {}
        dataConnRef.current = null;
      }
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (_) {}
        peerRef.current = null;
      }
      if (stopStream && localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) t.stop();
        localStreamRef.current = null;
        setCamReady(false);
      }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setStrangerInfo(null);
      setMessages([]);
      setRipple(false);
    },
    [actor],
  );

  // ── Auto-request camera/mic when Omegle opens ─────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on open change
  useEffect(() => {
    if (!open) return;
    if (localStreamRef.current) return; // already have stream
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: true,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        localStreamRef.current = stream;
        setCamReady(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const errName = (err as Error)?.name ?? "";
        if (
          errName === "NotAllowedError" ||
          errName === "PermissionDeniedError"
        ) {
          setPermError(
            "Camera/microphone access was denied. Please allow access and try again.",
          );
        } else if (errName === "NotFoundError") {
          setPermError("No camera or microphone found on this device.");
        } else {
          setPermError(
            "Could not access camera/microphone. Please check your browser settings.",
          );
        }
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Stop everything when modal closes
  useEffect(() => {
    if (!open) cleanup(true);
  }, [open, cleanup]);

  // Re-attach local stream to video element whenever state changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-attach
  useEffect(() => {
    if (camReady && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [camReady, state]);

  // Fetch active count
  useEffect(() => {
    if (!open) return;
    const fetchCount = async () => {
      try {
        const count = await (actor as any).getOmegleActiveCount();
        setActiveCount(Number(count));
      } catch (_) {
        setActiveCount(Math.floor(Math.random() * 300) + 80);
      }
    };
    fetchCount();
    const t = setInterval(fetchCount, 5000);
    return () => clearInterval(t);
  }, [open, actor]);

  // Scroll chat to bottom
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages triggers scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Apply cam/mic mute/unmute
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const t of stream.getVideoTracks()) t.enabled = camOn;
    for (const t of stream.getAudioTracks()) t.enabled = micOn;
  }, [camOn, micOn]);

  // ── handleConnectedCall ───────────────────────────────────────────────────
  const handleConnectedCall = useCallback(
    (call: MediaConnection, peerCountry: string, peerAge: number) => {
      callRef.current = call;
      call.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        setState("connected");
        setStrangerInfo({ country: peerCountry, age: peerAge });
        setRipple(true);
        playConnectTone();
        setTimeout(() => setRipple(false), 1500);
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            from: "system",
            text: `✅ Connected with stranger from ${peerCountry}, age ${peerAge}`,
            ts: Date.now(),
          },
        ]);
      });
      call.on("close", () => {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            from: "system",
            text: "👋 Stranger disconnected.",
            ts: Date.now(),
          },
        ]);
        setState("idle");
      });
      call.on("error", () => {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            from: "system",
            text: "⚠️ Connection error. Click Next to try again.",
            ts: Date.now(),
          },
        ]);
      });
    },
    [],
  );

  // ── startSearch ───────────────────────────────────────────────────────────
  const startSearch = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) {
      // Try to get camera first
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        localStreamRef.current = s;
        setCamReady(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
          localVideoRef.current.play().catch(() => {});
        }
      } catch (_err) {
        setPermError(
          "Camera/microphone access is required to start video chat. Please allow access.",
        );
        setState("error");
        return;
      }
    }

    const activeStream = localStreamRef.current;
    if (!activeStream) return;

    setState("searching");
    setSearchSeconds(0);
    setMessages([]);
    setStrangerInfo(null);

    // Clean up any existing connection
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    if (sidRef.current) {
      try {
        await (actor as any).leaveOmegleQueue(sidRef.current);
      } catch (_) {}
      sidRef.current = "";
    }
    if (callRef.current) {
      try {
        callRef.current.close();
      } catch (_) {}
      callRef.current = null;
    }
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (_) {}
      peerRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    // Unique peer ID for this session
    const myPeerId = `rck-${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;

    // Create PeerJS instance (uses peerjs.com cloud signaling server)
    let peer: Peer;
    try {
      peer = new Peer(myPeerId, {
        host: "0.peerjs.com",
        port: 443,
        path: "/",
        secure: true,
        debug: 0,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun.cloudflare.com:3478" },
          ],
        },
      });
      peerRef.current = peer;
    } catch (_err) {
      setPermError(
        "Could not initialize video connection. Please refresh and try again.",
      );
      setState("error");
      return;
    }

    // Wait for PeerJS to connect to its cloud signaling server
    const peerOpen = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 12000);
      peer.on("open", () => {
        clearTimeout(timeout);
        resolve(true);
      });
      peer.on("error", () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    if (!peerOpen || !peerRef.current) {
      setPermError(
        "Could not connect to video server. Check your internet and try again.",
      );
      setState("error");
      try {
        peer.destroy();
      } catch (_) {}
      return;
    }

    // Handle incoming calls from strangers
    peer.on("call", (incomingCall) => {
      incomingCall.answer(activeStream);
      // Get stranger info from dataChannel or use stored state
      handleConnectedCall(incomingCall, "Unknown", 0);
    });

    // Handle incoming data connection (text chat + metadata)
    peer.on("connection", (conn) => {
      dataConnRef.current = conn;
      conn.on("data", (data) => {
        if (
          typeof data === "object" &&
          data !== null &&
          "type" in (data as object)
        ) {
          const d = data as {
            type: string;
            country?: string;
            age?: number;
            text?: string;
          };
          if (d.type === "meta") {
            setStrangerInfo({
              country: d.country ?? "Unknown",
              age: d.age ?? 0,
            });
            // Update call handler info
            if (callRef.current) {
              setMessages((m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  from: "system",
                  text: `🌍 Stranger is from ${d.country}, age ${d.age}`,
                  ts: Date.now(),
                },
              ]);
            }
          } else if (d.type === "chat" && d.text) {
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                from: "stranger",
                text: d.text as string,
                ts: Date.now(),
              },
            ]);
          }
        } else if (typeof data === "string") {
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              from: "stranger",
              text: data,
              ts: Date.now(),
            },
          ]);
        }
      });
    });

    // Join ICP backend queue
    let sid: string;
    try {
      sid = await (actor as any).joinOmegleQueue(userCountry, BigInt(userAge));
      sidRef.current = sid;
      // Broadcast our PeerJS ID via signal channel
      await (actor as any).sendOmegleSignal(sid, "peerId", myPeerId);
    } catch (_err) {
      setPermError(
        "Could not connect to matchmaking server. Please try again.",
      );
      setState("error");
      try {
        peer.destroy();
      } catch (_) {}
      return;
    }

    // Search timer
    searchTimerRef.current = setInterval(
      () => setSearchSeconds((s) => s + 1),
      1000,
    );

    // Poll ICP backend for a match
    pollTimerRef.current = setInterval(async () => {
      if (!sidRef.current || !peerRef.current) return;
      try {
        const match = await (actor as any).pollOmegleMatch(sidRef.current);
        if (!match) return;

        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        if (searchTimerRef.current) {
          clearInterval(searchTimerRef.current);
          searchTimerRef.current = null;
        }

        const peerCountry = match.peerCountry as string;
        const peerAge = Number(match.peerAge);
        const isInitiator = match.isInitiator as boolean;

        // Get partner's PeerJS ID
        let partnerPeerId = "";
        for (let attempt = 0; attempt < 25; attempt++) {
          try {
            const signals = (await (actor as any).getOmegleSignals(
              sidRef.current,
            )) as Array<{ from: string; msgType: string; data: string }>;
            const peerIdSig = signals.find(
              (s) => s.msgType === "peerId" && s.data !== myPeerId,
            );
            if (peerIdSig) {
              partnerPeerId = peerIdSig.data;
              break;
            }
          } catch (_) {}
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!partnerPeerId) {
          // Could not get partner PeerJS ID, re-enter queue
          setMessages((m) => [
            ...m,
            {
              id: crypto.randomUUID(),
              from: "system",
              text: "Match found but reconnecting...",
              ts: Date.now(),
            },
          ]);
          return;
        }

        if (isInitiator && peerRef.current) {
          // Initiator: call the partner
          const call = peerRef.current.call(partnerPeerId, activeStream);
          handleConnectedCall(call, peerCountry, peerAge);

          // Also open a data connection for metadata + text chat
          const dc = peerRef.current.connect(partnerPeerId);
          dataConnRef.current = dc;
          dc.on("open", () => {
            // Send our metadata to stranger
            dc.send(
              JSON.stringify({
                type: "meta",
                country: userCountry,
                age: userAge,
              }),
            );
          });
          dc.on("data", (data) => {
            if (typeof data === "string") {
              try {
                const d = JSON.parse(data) as {
                  type: string;
                  country?: string;
                  age?: number;
                  text?: string;
                };
                if (d.type === "chat" && d.text) {
                  setMessages((m) => [
                    ...m,
                    {
                      id: crypto.randomUUID(),
                      from: "stranger",
                      text: d.text as string,
                      ts: Date.now(),
                    },
                  ]);
                }
              } catch (_) {
                setMessages((m) => [
                  ...m,
                  {
                    id: crypto.randomUUID(),
                    from: "stranger",
                    text: data,
                    ts: Date.now(),
                  },
                ]);
              }
            }
          });
        } else {
          // Non-initiator: update incoming call listener with correct info
          setStrangerInfo({ country: peerCountry, age: peerAge });
          peer.removeAllListeners("call");
          peer.on("call", (incomingCall) => {
            incomingCall.answer(activeStream);
            handleConnectedCall(incomingCall, peerCountry, peerAge);
          });
          // Send our metadata once data connection is established
          peer.removeAllListeners("connection");
          peer.on("connection", (conn) => {
            dataConnRef.current = conn;
            conn.on("open", () => {
              conn.send(
                JSON.stringify({
                  type: "meta",
                  country: userCountry,
                  age: userAge,
                }),
              );
            });
            conn.on("data", (data) => {
              if (typeof data === "string") {
                try {
                  const d = JSON.parse(data) as { type: string; text?: string };
                  if (d.type === "chat" && d.text) {
                    setMessages((m) => [
                      ...m,
                      {
                        id: crypto.randomUUID(),
                        from: "stranger",
                        text: d.text as string,
                        ts: Date.now(),
                      },
                    ]);
                  }
                } catch (_) {
                  setMessages((m) => [
                    ...m,
                    {
                      id: crypto.randomUUID(),
                      from: "stranger",
                      text: data,
                      ts: Date.now(),
                    },
                  ]);
                }
              }
            });
          });
        }
      } catch (_err) {
        // Silently retry
      }
    }, 1000);
  }, [actor, userCountry, userAge, handleConnectedCall]);

  const handleStop = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  const handleNext = useCallback(() => {
    cleanup();
    setState("idle");
    setTimeout(() => startSearch(), 200);
  }, [cleanup, startSearch]);

  const sendChatMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text || !dataConnRef.current) return;
    try {
      dataConnRef.current.send(JSON.stringify({ type: "chat", text }));
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), from: "me", text, ts: Date.now() },
      ]);
      setChatInput("");
    } catch (_) {
      addSystemMsg("Could not send message.");
    }
  }, [chatInput, addSystemMsg]);

  if (!open) return null;

  const flag = COUNTRY_FLAGS[userCountry] ?? "🌍";
  const strangerFlag = strangerInfo
    ? (COUNTRY_FLAGS[strangerInfo.country] ?? "🌍")
    : "";

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
              Real-Time Video Chat
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
                data-ocid="omegle.toggle"
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
              {state === "connected" && (
                <button
                  type="button"
                  onClick={() => setShowChat((v) => !v)}
                  data-ocid="omegle.toggle"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: showChat
                      ? "rgba(99,102,241,0.3)"
                      : "rgba(30,20,60,0.8)",
                    border: "1px solid rgba(99,102,241,0.4)",
                    color: "rgb(165,180,252)",
                  }}
                >
                  <MessageSquare size={13} />
                  Chat
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              cleanup(true);
              onClose();
            }}
            data-ocid="omegle.close_button"
            className="p-2 rounded-xl transition-all hover:scale-105"
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "rgb(252,165,165)",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Safe Chat notice */}
      <div
        className="flex items-center gap-2 px-4 py-2 text-xs flex-shrink-0"
        style={{
          background: "rgba(34,197,94,0.08)",
          borderBottom: "1px solid rgba(34,197,94,0.15)",
          color: "rgba(134,239,172,0.8)",
        }}
      >
        <Shield size={12} />
        <span>
          Safe Chat Policy: No nudity, harassment, or illegal content.
          Violations = instant ban.
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <AnimatePresence mode="wait">
          {/* Idle / setup */}
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center gap-6 p-6"
            >
              {/* Camera preview */}
              <div className="relative">
                {camReady ? (
                  <>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      aria-label="Your camera preview"
                      className="w-52 h-40 rounded-2xl object-cover"
                      style={{
                        border: "2px solid rgba(180,60,255,0.5)",
                        boxShadow: "0 0 30px rgba(160,40,255,0.4)",
                        transform: "scaleX(-1)",
                      }}
                    />
                    <div
                      className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(34,197,94,0.85)",
                        color: "white",
                      }}
                    >
                      📷 Camera Ready
                    </div>
                  </>
                ) : (
                  <motion.div
                    className="w-52 h-40 rounded-2xl flex flex-col items-center justify-center gap-2"
                    style={{
                      border: "2px dashed rgba(180,60,255,0.35)",
                      background: "rgba(30,20,60,0.5)",
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 2,
                    }}
                  >
                    <div className="text-3xl">📷</div>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(180,140,255,0.7)" }}
                    >
                      Requesting camera...
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "rgba(140,120,200,0.5)" }}
                    >
                      Please allow access
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 justify-center">
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
                onClick={startSearch}
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
                className="text-xs"
                style={{ color: "rgba(150,150,180,0.6)" }}
              >
                {flag} {userCountry} · Age {userAge}
              </div>
            </motion.div>
          )}

          {/* Error */}
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
                <p className="font-semibold mb-2">
                  To enable camera/mic in Chrome:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Tap the 🔒 lock icon in the address bar</li>
                  <li>Set Camera to &quot;Allow&quot;</li>
                  <li>Set Microphone to &quot;Allow&quot;</li>
                  <li>Tap Refresh button below</li>
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
              className="flex-1 flex flex-col items-center justify-center gap-6"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                aria-label="Your camera preview"
                className="w-52 h-40 rounded-2xl object-cover"
                style={{
                  border: "2px solid rgba(180,60,255,0.5)",
                  boxShadow: "0 0 20px rgba(160,40,255,0.3)",
                  transform: "scaleX(-1)",
                }}
              />
              <div className="flex flex-col items-center gap-3">
                <motion.div className="flex gap-2">
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
                  {flag} {userCountry} · Age {userAge} · {searchSeconds}s
                  elapsed
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

              {/* Remote video (full screen) */}
              <div className="flex-1 relative bg-black">
                {/* biome-ignore lint/a11y/useMediaCaption: live video stream, no captions available */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Stranger info overlay */}
                {strangerInfo && (
                  <div
                    className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "rgba(10,5,25,0.85)",
                      border: "1px solid rgba(180,60,255,0.4)",
                      color: "rgba(220,200,255,0.9)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <span>{strangerFlag}</span>
                    <span>{strangerInfo.country}</span>
                    <span style={{ color: "rgba(180,140,255,0.7)" }}>·</span>
                    <span>Age {strangerInfo.age}</span>
                  </div>
                )}
                {/* Action buttons */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <button
                    type="button"
                    onClick={handleNext}
                    data-ocid="omegle.secondary_button"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                    style={{
                      background: "rgba(99,102,241,0.85)",
                      border: "1px solid rgba(129,140,248,0.5)",
                      color: "white",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <RotateCcw size={14} /> Next
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    data-ocid="omegle.cancel_button"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.85)",
                      border: "1px solid rgba(252,165,165,0.4)",
                      color: "white",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <StopCircle size={14} /> Stop
                  </button>
                </div>
              </div>

              {/* Local picture-in-picture */}
              <div
                className="absolute top-3 right-3 w-32 h-24 rounded-xl overflow-hidden z-20"
                style={{
                  border: "2px solid rgba(180,60,255,0.5)",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Your camera"
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>

              {/* Text chat panel */}
              {showChat && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  className="w-72 flex flex-col flex-shrink-0"
                  style={{
                    background: "rgba(10,5,25,0.97)",
                    borderLeft: "1px solid rgba(180,60,255,0.25)",
                  }}
                >
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`text-xs px-3 py-2 rounded-xl max-w-[90%] ${
                          msg.from === "me"
                            ? "ml-auto"
                            : msg.from === "system"
                              ? "mx-auto text-center"
                              : ""
                        }`}
                        style={{
                          background:
                            msg.from === "me"
                              ? "rgba(99,102,241,0.4)"
                              : msg.from === "system"
                                ? "rgba(30,20,60,0.7)"
                                : "rgba(50,30,80,0.7)",
                          color:
                            msg.from === "system"
                              ? "rgba(180,160,220,0.7)"
                              : "rgba(220,200,255,0.9)",
                          border:
                            msg.from === "system"
                              ? "none"
                              : "1px solid rgba(180,60,255,0.2)",
                        }}
                      >
                        {msg.text}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div
                    className="flex gap-2 p-3"
                    style={{ borderTop: "1px solid rgba(180,60,255,0.2)" }}
                  >
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                      placeholder="Type a message..."
                      data-ocid="omegle.input"
                      className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                      style={{
                        background: "rgba(30,20,60,0.9)",
                        border: "1px solid rgba(180,60,255,0.3)",
                        color: "rgba(220,200,255,0.9)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendChatMessage}
                      data-ocid="omegle.submit_button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{
                        background: "rgba(99,102,241,0.5)",
                        border: "1px solid rgba(99,102,241,0.4)",
                        color: "white",
                      }}
                    >
                      Send
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
