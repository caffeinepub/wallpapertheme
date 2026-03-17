// @ts-nocheck -- PeerJS loaded via CDN, types declared below
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Copy,
  FlipHorizontal,
  Gamepad2,
  Grid3X3,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Shield,
  StopCircle,
  Timer,
  UserPlus,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReckon } from "../App";
import { useActor } from "../hooks/useActor";
import LudoGame from "./LudoGame";
import TicTacToe3D from "./TicTacToe3D";

type Message = {
  id: string;
  text: string;
  from: "me" | "stranger";
  time: string;
};
type Status =
  | "idle"
  | "searching"
  | "connecting"
  | "connected"
  | "disconnected";
type PanelTab = "chat" | "members";
type MobilePanel = null | PanelTab;

interface Props {
  open?: boolean;
  onClose?: () => void;
}

let msgCounter = 0;
const mkMsg = (text: string, from: "me" | "stranger"): Message => ({
  id: `msg-${++msgCounter}`,
  text,
  from,
  time: new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
});

const SEARCH_DURATION = 120; // seconds
const POLL_INTERVAL = 800; // ms
const MAX_POLLS = Math.ceil((SEARCH_DURATION * 1000) / POLL_INTERVAL);

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const letters = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  const nums = Array.from(
    { length: 4 },
    () => digits[Math.floor(Math.random() * digits.length)],
  ).join("");
  return letters + nums;
}

function ensurePeerJS(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Peer) {
      resolve();
      return;
    }
    const existing = document.getElementById("peerjs-cdn");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.id = "peerjs-cdn";
    s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

export default function OmegleChat({ open, onClose }: Props) {
  const { actor } = useActor();
  const { currentUser } = useReckon();
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const roomCodeRef = useRef<string | null>(null);
  if (!roomCodeRef.current) roomCodeRef.current = generateRoomCode();
  const roomCode = roomCodeRef.current;

  const [_myPeerId, setMyPeerId] = useState("");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [camError, setCamError] = useState("");
  const [peerReady, setPeerReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<PanelTab>("chat");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [showRoomConnect, setShowRoomConnect] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showLudo, setShowLudo] = useState(false);
  const [showTtt, setShowTtt] = useState(false);
  const [peerMeta, setPeerMeta] = useState<{
    name: string;
    city: string;
    country: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [bottomChatInput, setBottomChatInput] = useState("");

  // Search / countdown state
  const [searchSecondsLeft, setSearchSecondsLeft] = useState(SEARCH_DURATION);
  const [searchError, setSearchError] = useState("");
  const sessionIdRef = useRef<string | null>(null);
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const connectionRef = useRef(null);
  const callRef = useRef(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef(mobilePanel);

  useEffect(() => {
    mobilePanelRef.current = mobilePanel;
    if (mobilePanel === "chat") setUnreadCount(0);
  }, [mobilePanel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const clearSearchTimers = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const handleDisconnect = useCallback((manual = true) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    callRef.current?.close();
    connectionRef.current?.close();
    callRef.current = null;
    connectionRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsConnected(false);
    setIsConnecting(false);
    setStatus(manual ? "idle" : "disconnected");
    setSearchSecondsLeft(SEARCH_DURATION);
    setSearchError("");
    pollCountRef.current = 0;
    sessionIdRef.current = null;
    if (!manual)
      setMessages((prev) => [
        ...prev,
        mkMsg("Stranger has disconnected.", "stranger"),
      ]);
  }, []);

  const connectToPeerId = useCallback(
    (targetId: string) => {
      if (!peerRef.current || !localStreamRef.current) return;
      setIsConnecting(true);
      setStatus("connecting");

      const conn = peerRef.current.connect(targetId);
      connectionRef.current = conn;
      conn.on("open", () => {
        try {
          conn.send(
            JSON.stringify({
              type: "meta",
              name: currentUserRef.current?.name || "User",
              city: currentUserRef.current?.city || "",
              country: selectedCountry,
            }),
          );
        } catch {}
      });
      conn.on("data", (data: any) => {
        try {
          const parsed = JSON.parse(String(data));
          if (parsed.type === "meta") {
            setPeerMeta({
              name: parsed.name || "Stranger",
              city: parsed.city || "",
              country: parsed.country || "",
            });
            return;
          }
          if (parsed.type === "chat") {
            setMessages((prev) => [...prev, mkMsg(parsed.text, "stranger")]);
            if (mobilePanelRef.current !== "chat") setUnreadCount((n) => n + 1);
            return;
          }
        } catch {}
        setMessages((prev) => [...prev, mkMsg(String(data), "stranger")]);
        if (mobilePanelRef.current !== "chat") setUnreadCount((n) => n + 1);
      });

      const call = peerRef.current.call(targetId, localStreamRef.current);
      callRef.current = call;
      call.on("stream", (remoteStream: any) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
        }
        setIsConnected(true);
        setIsConnecting(false);
        setStatus("connected");
      });
      call.on("close", () => handleDisconnect(false));
      call.on("error", () => {
        setIsConnecting(false);
        setStatus("disconnected");
      });
    },
    [handleDisconnect],
  );

  // Start auto-search
  const startSearch = async () => {
    if (!peerReady || !actor) return;
    setSearchError("");
    setSearchSecondsLeft(SEARCH_DURATION);
    pollCountRef.current = 0;
    setStatus("searching");

    try {
      const sid = await actor.joinOmegleQueue("Unknown", BigInt(25));
      sessionIdRef.current = sid;
    } catch {
      setSearchError("Could not join matchmaking queue. Try again.");
      setStatus("idle");
      return;
    }

    // Countdown timer
    countdownTimerRef.current = setInterval(() => {
      setSearchSecondsLeft((prev) => {
        if (prev <= 1) {
          clearSearchTimers();
          setStatus("idle");
          setSearchError("No stranger found. Try again.");
          if (sessionIdRef.current && actor) {
            actor.leaveOmegleQueue(sessionIdRef.current).catch(() => {});
            sessionIdRef.current = null;
          }
          return SEARCH_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll for match
    pollTimerRef.current = setInterval(async () => {
      if (pollCountRef.current >= MAX_POLLS) {
        clearSearchTimers();
        return;
      }
      pollCountRef.current++;
      const sid = sessionIdRef.current;
      if (!sid || !actor) return;

      try {
        const matchInfo = await actor.pollOmegleMatch(sid);
        if (matchInfo?.peerId) {
          clearSearchTimers();
          setStatus("connecting");
          setSearchSecondsLeft(SEARCH_DURATION);
          connectToPeerId(matchInfo.peerId);
        }
      } catch {
        // keep trying
      }
    }, POLL_INTERVAL);
  };

  const stopSearch = () => {
    clearSearchTimers();
    setStatus("idle");
    setSearchSecondsLeft(SEARCH_DURATION);
    setSearchError("");
    if (sessionIdRef.current && actor) {
      actor.leaveOmegleQueue(sessionIdRef.current).catch(() => {});
      sessionIdRef.current = null;
    }
  };

  useEffect(() => {
    let peer: any = null;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      } catch {
        setCamError(
          "Camera/mic access denied. Please allow permissions and refresh.",
        );
        return;
      }

      await ensurePeerJS();

      peer = new window.Peer(roomCode);
      peerRef.current = peer;

      peer.on("open", (id: string) => {
        setMyPeerId(id);
        setPeerReady(true);
      });

      peer.on("error", (err: any) => {
        if (err.type === "unavailable-id") {
          const newCode = generateRoomCode();
          roomCodeRef.current = newCode;
          peer.destroy();
          const retryPeer = new window.Peer(newCode);
          peerRef.current = retryPeer;
          retryPeer.on("open", (id: string) => {
            setMyPeerId(id);
            setPeerReady(true);
          });
          retryPeer.on("call", handleIncomingCall);
          retryPeer.on("connection", handleIncomingConn);
        } else {
          console.error("PeerJS error:", err);
          setCamError(`Connection error: ${err.message || err.type}`);
        }
      });

      const handleIncomingCall = (incomingCall: any) => {
        const stream = localStreamRef.current;
        if (!stream) return;
        incomingCall.answer(stream);
        callRef.current = incomingCall;
        setIsConnecting(true);
        setStatus("connecting");
        incomingCall.on("stream", (remoteStream: any) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => {});
          }
          setIsConnected(true);
          setIsConnecting(false);
          setStatus("connected");
        });
        incomingCall.on("close", () => handleDisconnect(false));
      };

      const handleIncomingConn = (conn: any) => {
        connectionRef.current = conn;
        conn.on("open", () => {
          try {
            conn.send(
              JSON.stringify({
                type: "meta",
                name: currentUserRef.current?.name || "User",
                city: currentUserRef.current?.city || "",
                country: "India",
              }),
            );
          } catch {}
        });
        conn.on("data", (data: any) => {
          try {
            const parsed = JSON.parse(String(data));
            if (parsed.type === "meta") {
              setPeerMeta({
                name: parsed.name || "Stranger",
                city: parsed.city || "",
                country: parsed.country || "",
              });
              return;
            }
            if (parsed.type === "chat") {
              setMessages((prev) => [...prev, mkMsg(parsed.text, "stranger")]);
              if (mobilePanelRef.current !== "chat")
                setUnreadCount((n) => n + 1);
              return;
            }
          } catch {}
          setMessages((prev) => [...prev, mkMsg(String(data), "stranger")]);
          if (mobilePanelRef.current !== "chat") setUnreadCount((n) => n + 1);
        });
      };

      peer.on("call", handleIncomingCall);
      peer.on("connection", handleIncomingConn);
    };

    init();

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (localStreamRef.current) {
        for (const t of (localStreamRef.current as MediaStream).getTracks())
          t.stop();
      }
      callRef.current?.close();
      connectionRef.current?.close();
      peerRef.current?.destroy();
    };
  }, [handleDisconnect, roomCode]);

  const connectToPeer = () => {
    const id = remotePeerId.trim();
    if (!id || !peerRef.current || !localStreamRef.current) return;
    connectToPeerId(id);
  };

  const sendMessage = () => {
    if (!inputMsg.trim() || !connectionRef.current) return;
    connectionRef.current.send(
      JSON.stringify({ type: "chat", text: inputMsg.trim() }),
    );
    setMessages((prev) => [...prev, mkMsg(inputMsg.trim(), "me")]);
    setInputMsg("");
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateShareLink = () =>
    `${window.location.origin}/?room=${roomCodeRef.current}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(generateShareLink()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const shareViaWhatsApp = () => {
    const link = generateShareLink();
    const text = encodeURIComponent(
      `Join my Reckon video call! Room Code: ${roomCode} or click: ${link}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const sendBottomMessage = () => {
    if (!bottomChatInput.trim() || !connectionRef.current) return;
    connectionRef.current.send(bottomChatInput.trim());
    setMessages((prev) => [...prev, mkMsg(bottomChatInput.trim(), "me")]);
    setBottomChatInput("");
  };

  const toggleCam = () => {
    if (localStreamRef.current)
      for (const t of (localStreamRef.current as MediaStream).getVideoTracks())
        t.enabled = !camOn;
    setCamOn((v) => !v);
  };

  const toggleMic = () => {
    if (localStreamRef.current)
      for (const t of (localStreamRef.current as MediaStream).getAudioTracks())
        t.enabled = !micOn;
    setMicOn((v) => !v);
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: newMode },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      // Replace in localStream
      if (localStreamRef.current) {
        const oldTrack = (
          localStreamRef.current as MediaStream
        ).getVideoTracks()[0];
        (localStreamRef.current as MediaStream).removeTrack(oldTrack);
        oldTrack.stop();
        (localStreamRef.current as MediaStream).addTrack(newVideoTrack);
      }
      // Update local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      // Replace in active call
      if (callRef.current) {
        const sender = callRef.current.peerConnection
          ?.getSenders()
          .find((s: any) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(newVideoTrack);
      }
      setFacingMode(newMode);
    } catch {
      // silently fail on devices without front/back cameras
    }
  };

  const cycleMobilePanel = () => {
    setMobilePanel((prev) => {
      if (prev === null) return "chat";
      if (prev === "chat") return "members";
      return null;
    });
  };

  const statusBadge = {
    idle: {
      label: "Waiting...",
      className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    },
    searching: {
      label: "Searching...",
      className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    connecting: {
      label: "Connecting...",
      className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    connected: {
      label: "Connected",
      className: "bg-green-500/20 text-green-300 border-green-500/30",
    },
    disconnected: {
      label: "Disconnected",
      className: "bg-red-500/20 text-red-300 border-red-500/30",
    },
  }[status];

  // SVG countdown ring
  const RING_R = 36;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringProgress = searchSecondsLeft / SEARCH_DURATION;
  const ringOffset = RING_CIRC * (1 - ringProgress);

  // Members panel
  const membersPanelContent = (
    <div data-ocid="omegle.members_panel" className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                {roomCode[0]}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">
                  You
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                  Host
                </span>
              </div>
              <p className="text-[10px] text-white/40 font-mono">{roomCode}</p>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5 border border-white/10">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-sm font-bold text-white">
                  {remotePeerId ? remotePeerId[0].toUpperCase() : "G"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-cyan-400 rounded-full border-2 border-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">
                    Stranger
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                    Peer
                  </span>
                </div>
                <p className="text-[10px] text-white/40 font-mono">
                  {remotePeerId
                    ? remotePeerId.slice(0, 8) +
                      (remotePeerId.length > 8 ? "..." : "")
                    : "Guest"}
                </p>
              </div>
            </div>
          ) : (
            <div
              data-ocid="omegle.empty_state"
              className="text-center py-8 text-white/25 text-xs flex flex-col items-center gap-2"
            >
              <Users className="w-8 h-8 text-white/10" />
              <span>No one else is here yet</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Chat panel
  const chatPanelContent = (
    <>
      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-white/25 text-xs">
            No messages yet. Connect to start chatting!
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 ${msg.from === "me" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                    msg.from === "me"
                      ? "bg-gradient-to-br from-cyan-600 to-purple-700 text-white rounded-br-sm"
                      : msg.text === "Stranger has disconnected."
                        ? "bg-red-900/40 text-red-300 italic border border-red-500/20 rounded-bl-sm"
                        : "bg-white/10 text-white/90 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-white/25">{msg.time}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      <div className="px-3 py-2 border-t border-white/10 flex gap-2 flex-shrink-0">
        <Input
          data-ocid="omegle.search_input"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={isConnected ? "Type a message..." : "Connect first..."}
          disabled={!isConnected}
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/25 text-xs h-8 focus:border-cyan-500/30"
        />
        <Button
          data-ocid="omegle.submit_button"
          size="icon"
          onClick={sendMessage}
          disabled={!isConnected || !inputMsg.trim()}
          className="w-8 h-8 flex-shrink-0 bg-cyan-600 hover:bg-cyan-500 border-0"
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </>
  );

  const desktopRightPanel = (
    <div className="w-64 flex-col border-l border-white/10 bg-black/40 flex-shrink-0 hidden sm:flex">
      <div className="flex border-b border-white/10 flex-shrink-0">
        <button
          type="button"
          data-ocid="omegle.tab"
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "chat"
              ? "text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
          {unreadCount > 0 && activeTab !== "chat" && (
            <span className="min-w-[14px] h-[14px] bg-pink-500 rounded-full border border-black flex items-center justify-center text-[9px] font-bold text-white px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          data-ocid="omegle.tab"
          onClick={() => setActiveTab("members")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeTab === "members"
              ? "text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Members
          <span className="min-w-[14px] h-[14px] bg-white/10 rounded-full flex items-center justify-center text-[9px] text-white/50 px-0.5">
            {isConnected ? 2 : 1}
          </span>
        </button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        {activeTab === "chat" ? chatPanelContent : membersPanelContent}
      </div>
    </div>
  );

  const mobileOverlayPanel = mobilePanel !== null && (
    <div
      data-ocid="omegle.panel"
      className="sm:hidden absolute top-0 right-0 bottom-0 w-[280px] flex flex-col bg-black/95 border-l border-white/10 z-50"
      style={{ animation: "slideInRight 0.2s ease-out" }}
    >
      <div className="flex border-b border-white/10 flex-shrink-0">
        <button
          type="button"
          data-ocid="omegle.tab"
          onClick={() => setMobilePanel("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            mobilePanel === "chat"
              ? "text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>
        <button
          type="button"
          data-ocid="omegle.tab"
          onClick={() => setMobilePanel("members")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            mobilePanel === "members"
              ? "text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Members
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel(null)}
          className="w-10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
          data-ocid="omegle.close_button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        {mobilePanel === "chat" ? chatPanelContent : membersPanelContent}
      </div>
    </div>
  );

  const isActiveCall = isConnected || isConnecting || status === "searching";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-black animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-wide bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Omegle Live
            </h2>
            <div className="flex items-center gap-1 text-xs text-white/50">
              <Users className="w-3 h-3" />
              <span>Live worldwide</span>
            </div>
          </div>
          {/* Game shortcut buttons */}
          <div className="flex items-center gap-1.5 ml-3">
            <button
              type="button"
              onClick={() => setShowLudo(true)}
              title="Play Ludo"
              data-ocid="omegle.ludo_button"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.4)",
                boxShadow: "0 0 8px rgba(34,197,94,0.3)",
              }}
            >
              <Gamepad2 className="w-4 h-4" style={{ color: "#86efac" }} />
            </button>
            <button
              type="button"
              onClick={() => setShowTtt(true)}
              title="Tic-Tac-Toe"
              data-ocid="omegle.ttt_button"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: "rgba(168,85,247,0.15)",
                border: "1px solid rgba(168,85,247,0.4)",
                boxShadow: "0 0 8px rgba(168,85,247,0.3)",
              }}
            >
              <Grid3X3 className="w-4 h-4" style={{ color: "#d8b4fe" }} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
            <Shield className="w-3 h-3" />
            <span className="hidden sm:inline">Safe Chat</span>
          </div>
          <Badge className={`text-xs border ${statusBadge.className}`}>
            {status === "connecting" || status === "searching" ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 animate-pulse" />
                {statusBadge.label}
              </span>
            ) : status === "connected" ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {statusBadge.label}
              </span>
            ) : status === "disconnected" ? (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                {statusBadge.label}
              </span>
            ) : (
              statusBadge.label
            )}
          </Badge>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-ocid="omegle.close_button"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {camError && (
        <div
          data-ocid="omegle.error_state"
          className="px-4 py-2 bg-red-900/40 border-b border-red-500/30 text-red-300 text-xs text-center"
        >
          {camError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Left: Video + Controls */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Video area */}
          <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
            {/* biome-ignore lint/a11y/useMediaCaption: live WebRTC video call stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: isConnected ? "block" : "none" }}
            />

            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
                {status === "searching" ? (
                  /* Countdown ring */
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24">
                      <svg
                        className="w-24 h-24 -rotate-90"
                        viewBox="0 0 88 88"
                        aria-label="Search countdown timer"
                        role="img"
                      >
                        <title>WhatsApp</title>
                        <circle
                          cx="44"
                          cy="44"
                          r={RING_R}
                          fill="none"
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="6"
                        />
                        <circle
                          cx="44"
                          cy="44"
                          r={RING_R}
                          fill="none"
                          stroke="url(#searchGrad)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={RING_CIRC}
                          strokeDashoffset={ringOffset}
                          style={{
                            transition: "stroke-dashoffset 0.9s linear",
                          }}
                        />
                        <defs>
                          <linearGradient
                            id="searchGrad"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                          >
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center rotate-0">
                        <span className="text-2xl font-bold font-mono text-cyan-300">
                          {searchSecondsLeft}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/60 text-sm">
                      <Timer className="w-4 h-4 text-cyan-400" />
                      <span>Searching for someone</span>
                      <span className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 text-center">
                      Connecting you with a real user worldwide
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                      <Video className="w-9 h-9 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm text-center">
                      {isConnecting
                        ? "Connecting to peer..."
                        : "Find a stranger or use Room Code"}
                    </p>
                    {isConnecting && (
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    )}
                    {searchError && (
                      <div
                        data-ocid="omegle.error_state"
                        className="mt-2 px-4 py-2 rounded-lg bg-red-900/40 border border-red-500/30 text-red-300 text-xs text-center"
                      >
                        {searchError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── EXIT button – top-right of video, always shown when active ── */}
            {isActiveCall && (
              <button
                type="button"
                data-ocid="omegle.close_button"
                onClick={() => handleDisconnect(true)}
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-900/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Exit
              </button>
            )}

            {/* Local PiP */}
            <div className="absolute bottom-3 right-3 w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!camOn && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <VideoOff className="w-5 h-5 text-white/50" />
                </div>
              )}
            </div>

            {/* Add User overlay panel */}
            {showAddUser && (
              <div
                data-ocid="omegle.modal"
                className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-40 w-72 rounded-2xl bg-black/90 border border-white/15 shadow-2xl backdrop-blur-sm p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/70">
                    Invite someone to join
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">
                    Your Room Code
                  </span>
                  <span
                    className="text-2xl font-mono font-bold tracking-[0.15em] text-cyan-300"
                    style={{
                      textShadow:
                        "0 0 10px rgba(6,182,212,0.7), 0 0 20px rgba(6,182,212,0.3)",
                    }}
                  >
                    {roomCode}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={copyRoomCode}
                  className="w-full gap-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-xs h-8"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "Copied!" : "Copy Room Code"}
                </Button>
                <button
                  type="button"
                  onClick={shareViaWhatsApp}
                  className="w-full flex items-center justify-center gap-2 h-8 rounded-md text-xs font-medium text-white transition-all"
                  style={{
                    background: "rgba(37,211,102,0.2)",
                    border: "1px solid rgba(37,211,102,0.4)",
                    boxShadow: "0 0 10px rgba(37,211,102,0.2)",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3.5 h-3.5 text-green-400"
                  >
                    <title>WhatsApp</title>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Invite via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="w-full flex items-center justify-center gap-2 h-8 rounded-md text-xs font-medium text-white/70 transition-all hover:text-white"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Copy className="w-3 h-3" />
                  {copiedLink ? "Link Copied!" : "Copy Invite Link"}
                </button>
              </div>
            )}

            {/* Bottom-left video controls overlay */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button
                type="button"
                onClick={toggleCam}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                  camOn
                    ? "bg-white/10 border-white/20 hover:bg-white/20"
                    : "bg-red-500/30 border-red-500/50 hover:bg-red-500/40"
                }`}
              >
                {camOn ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4 text-red-300" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleMic}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                  micOn
                    ? "bg-white/10 border-white/20 hover:bg-white/20"
                    : "bg-red-500/30 border-red-500/50 hover:bg-red-500/40"
                }`}
              >
                {micOn ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4 text-red-300" />
                )}
              </button>

              {/* Flip Camera button */}
              <button
                type="button"
                data-ocid="omegle.toggle"
                onClick={switchCamera}
                title={
                  facingMode === "user"
                    ? "Switch to back camera"
                    : "Switch to front camera"
                }
                className="w-9 h-9 rounded-full flex items-center justify-center border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/30 transition-all active:scale-95"
              >
                <FlipHorizontal className="w-4 h-4 text-cyan-300" />
              </button>

              {/* Add User button – only when connected */}
              {isConnected && (
                <button
                  type="button"
                  data-ocid="omegle.open_modal_button"
                  onClick={() => setShowAddUser((v) => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center border border-purple-500/50 bg-purple-600/30 hover:bg-purple-600/50 transition-all"
                >
                  <UserPlus className="w-4 h-4 text-purple-300" />
                </button>
              )}

              {/* Chat/Members toggle – mobile only */}
              <button
                type="button"
                onClick={cycleMobilePanel}
                data-ocid="omegle.toggle"
                className={`sm:hidden relative w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                  mobilePanel !== null
                    ? "bg-cyan-500/30 border-cyan-500/50"
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
              >
                {mobilePanel === "members" ? (
                  <Users className="w-4 h-4" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {unreadCount > 0 && mobilePanel !== "chat" && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-pink-500 rounded-full border border-black flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Bottom Controls Bar ── */}
          <div className="px-3 py-2.5 space-y-2.5 bg-black/60 border-t border-white/10 flex-shrink-0 overflow-hidden">
            {/* Find Stranger button / Stop searching */}
            {status === "idle" || status === "disconnected" ? (
              <Button
                data-ocid="omegle.primary_button"
                onClick={startSearch}
                disabled={!peerReady}
                className="w-full h-10 gap-2 font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 border-0 text-white shadow-lg shadow-green-900/40"
              >
                <Video className="w-4 h-4" />
                Find Stranger (120s)
              </Button>
            ) : status === "searching" ? (
              <Button
                data-ocid="omegle.cancel_button"
                onClick={stopSearch}
                className="w-full h-10 gap-2 font-semibold text-sm bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 border-0 text-white"
              >
                <StopCircle className="w-4 h-4" />
                Stop Searching
              </Button>
            ) : isConnected ? (
              <Button
                data-ocid="omegle.delete_button"
                onClick={() => handleDisconnect(true)}
                className="w-full h-10 gap-2 font-semibold text-sm bg-red-700 hover:bg-red-600 border-0 text-white"
              >
                <PhoneOff className="w-4 h-4" />
                Disconnect
              </Button>
            ) : null}

            {/* Collapsible Room Code section */}
            <div>
              <button
                type="button"
                onClick={() => setShowRoomConnect((v) => !v)}
                className="w-full flex items-center justify-between text-[10px] text-white/40 hover:text-white/60 transition-colors py-0.5 px-1"
              >
                <span className="uppercase tracking-widest">
                  Connect with Room Code
                </span>
                <span
                  className={`transition-transform ${showRoomConnect ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>

              {showRoomConnect && (
                <div className="mt-2 space-y-2">
                  {/* Room code display */}
                  <div className="flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-black/60 border border-cyan-500/30">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-lg font-mono font-bold tracking-[0.15em] text-cyan-300"
                        style={{ textShadow: "0 0 10px rgba(6,182,212,0.7)" }}
                      >
                        {roomCode}
                      </span>
                      <Button
                        data-ocid="omegle.secondary_button"
                        size="sm"
                        onClick={copyRoomCode}
                        className="h-7 px-2 gap-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-xs"
                      >
                        {copied ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={shareViaWhatsApp}
                        className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-medium text-white transition-all"
                        style={{
                          background: "rgba(37,211,102,0.2)",
                          border: "1px solid rgba(37,211,102,0.4)",
                          boxShadow: "0 0 8px rgba(37,211,102,0.15)",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3 h-3 text-green-400"
                        >
                          <title>WhatsApp</title>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={copyShareLink}
                        className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-medium text-white/60 transition-all hover:text-white"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Copy className="w-3 h-3" />
                        {copiedLink ? "Copied!" : "Copy Link"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      data-ocid="omegle.input"
                      value={remotePeerId}
                      onChange={(e) => setRemotePeerId(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !isConnected && connectToPeer()
                      }
                      placeholder="Paste friend's Room Code..."
                      className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs h-9 focus:border-cyan-500/50"
                    />
                    {!isConnected ? (
                      <Button
                        data-ocid="omegle.secondary_button"
                        size="sm"
                        onClick={connectToPeer}
                        disabled={
                          !remotePeerId.trim() || isConnecting || !peerReady
                        }
                        className="flex-shrink-0 gap-1.5 bg-green-600 hover:bg-green-500 text-white border-0 text-xs h-9 px-3"
                      >
                        <Phone className="w-3 h-3" />
                        {isConnecting ? "Calling..." : "Connect"}
                      </Button>
                    ) : (
                      <Button
                        data-ocid="omegle.delete_button"
                        size="sm"
                        onClick={() => handleDisconnect(true)}
                        className="flex-shrink-0 gap-1.5 bg-red-600 hover:bg-red-500 text-white border-0 text-xs h-9 px-3"
                      >
                        <PhoneOff className="w-3 h-3" />
                        Disconnect
                      </Button>
                    )}
                  </div>

                  <p className="text-[10px] text-white/25 text-center">
                    Share your Room Code with a friend. When they enter it and
                    click Connect, you'll be live together.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating bottom chat bar when connected */}
        {isConnected && (
          <div
            className="absolute bottom-16 left-2 right-2 z-40 flex gap-2 items-center px-3 py-2 rounded-xl backdrop-blur-md"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(0,245,255,0.15)",
              boxShadow: "0 0 20px rgba(0,245,255,0.08)",
            }}
          >
            <div className="flex-1 min-w-0">
              {messages.length > 0 && (
                <p className="text-[10px] text-white/40 truncate mb-1">
                  <span
                    className={
                      messages[messages.length - 1].from === "me"
                        ? "text-cyan-400"
                        : "text-pink-400"
                    }
                  >
                    {messages[messages.length - 1].from === "me"
                      ? "You"
                      : peerMeta?.name || "Stranger"}
                    :
                  </span>{" "}
                  {messages[messages.length - 1].text}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  value={bottomChatInput}
                  onChange={(e) => setBottomChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendBottomMessage()}
                  placeholder="Quick message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/40"
                />
                <button
                  type="button"
                  onClick={sendBottomMessage}
                  disabled={!bottomChatInput.trim()}
                  className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: "rgba(0,245,255,0.2)",
                    border: "1px solid rgba(0,245,255,0.3)",
                  }}
                >
                  <Send className="w-3.5 h-3.5 text-cyan-300" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop right panel */}
        {desktopRightPanel}

        {/* Mobile overlay panel */}
        {mobileOverlayPanel}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Game overlays */}
      <LudoGame open={showLudo} onClose={() => setShowLudo(false)} />
      <TicTacToe3D open={showTtt} onClose={() => setShowTtt(false)} />
    </div>
  );
}
