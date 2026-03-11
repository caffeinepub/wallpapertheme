// @ts-nocheck -- PeerJS loaded via CDN, types declared below
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Copy,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Shield,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  text: string;
  from: "me" | "stranger";
  time: string;
};
type Status = "idle" | "connecting" | "connected" | "disconnected";

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

// Ensure PeerJS CDN script is loaded
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

export default function OmegleChat({ open: _open, onClose }: Props) {
  const [myPeerId, setMyPeerId] = useState("");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [camError, setCamError] = useState("");
  const [peerReady, setPeerReady] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const connectionRef = useRef(null);
  const callRef = useRef(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const handleDisconnect = useCallback((manual = true) => {
    callRef.current?.close();
    connectionRef.current?.close();
    callRef.current = null;
    connectionRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsConnected(false);
    setIsConnecting(false);
    setStatus(manual ? "idle" : "disconnected");
    if (!manual)
      setMessages((prev) => [
        ...prev,
        mkMsg("Stranger has disconnected.", "stranger"),
      ]);
  }, []);

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

      peer = new window.Peer();
      peerRef.current = peer;

      peer.on("open", (id: string) => {
        setMyPeerId(id);
        setPeerReady(true);
      });

      peer.on("error", (err: any) => {
        console.error("PeerJS error:", err);
        setCamError(`Connection error: ${err.message || err.type}`);
      });

      peer.on("call", (incomingCall: any) => {
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
      });

      peer.on("connection", (conn: any) => {
        connectionRef.current = conn;
        conn.on("data", (data: any) => {
          setMessages((prev) => [...prev, mkMsg(String(data), "stranger")]);
        });
      });
    };

    init();

    return () => {
      if (localStreamRef.current) {
        for (const t of (localStreamRef.current as MediaStream).getTracks())
          t.stop();
      }
      callRef.current?.close();
      connectionRef.current?.close();
      peerRef.current?.destroy();
    };
  }, [handleDisconnect]);

  const connectToPeer = () => {
    const id = remotePeerId.trim();
    if (!id || !peerRef.current || !localStreamRef.current) return;

    setIsConnecting(true);
    setStatus("connecting");

    const conn = peerRef.current.connect(id);
    connectionRef.current = conn;
    conn.on("data", (data: any) => {
      setMessages((prev) => [...prev, mkMsg(String(data), "stranger")]);
    });

    const call = peerRef.current.call(id, localStreamRef.current);
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
    call.on("error", (err: any) => {
      console.error("Call error:", err);
      setIsConnecting(false);
      setStatus("disconnected");
    });
  };

  const sendMessage = () => {
    if (!inputMsg.trim() || !connectionRef.current) return;
    connectionRef.current.send(inputMsg.trim());
    setMessages((prev) => [...prev, mkMsg(inputMsg.trim(), "me")]);
    setInputMsg("");
  };

  const copyId = () => {
    if (!myPeerId) return;
    navigator.clipboard.writeText(myPeerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      for (const t of (localStreamRef.current as MediaStream).getVideoTracks())
        t.enabled = !camOn;
    }
    setCamOn((v) => !v);
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      for (const t of (localStreamRef.current as MediaStream).getAudioTracks())
        t.enabled = !micOn;
    }
    setMicOn((v) => !v);
  };

  const statusBadge = {
    idle: {
      label: "Waiting...",
      className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
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

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] text-white overflow-hidden">
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
              <span>1,234+ online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
            <Shield className="w-3 h-3" />
            <span>Safe Chat</span>
          </div>
          <Badge className={`text-xs border ${statusBadge.className}`}>
            {status === "connecting" ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3 animate-pulse" /> {statusBadge.label}
              </span>
            ) : status === "connected" ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" /> {statusBadge.label}
              </span>
            ) : status === "disconnected" ? (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> {statusBadge.label}
              </span>
            ) : (
              statusBadge.label
            )}
          </Badge>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video + Controls */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="relative flex-1 bg-black overflow-hidden">
            {/* biome-ignore lint/a11y/useMediaCaption: live WebRTC video call stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ display: isConnected ? "block" : "none" }}
            />

            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                  <Video className="w-10 h-10 text-white/20" />
                </div>
                <p className="text-white/40 text-sm">
                  {isConnecting
                    ? "Connecting to peer..."
                    : "Enter a Room ID below to connect"}
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
              </div>
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
            </div>
          </div>

          {/* Room ID + Connect Controls */}
          <div className="px-4 py-3 space-y-3 bg-black/60 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-cyan-500/30 flex items-center gap-2 min-w-0">
                <span className="text-xs text-cyan-400 font-medium whitespace-nowrap">
                  Your ID:
                </span>
                <span className="text-xs text-white/80 font-mono truncate flex-1">
                  {myPeerId || (peerReady ? "" : "Initializing...")}
                </span>
              </div>
              <Button
                data-ocid="omegle.primary_button"
                size="sm"
                onClick={copyId}
                disabled={!myPeerId}
                className="flex-shrink-0 gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white border-0 text-xs"
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                data-ocid="omegle.input"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !isConnected && connectToPeer()
                }
                placeholder="Paste friend's Room ID here..."
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs h-9 focus:border-cyan-500/50"
              />
              {!isConnected ? (
                <Button
                  data-ocid="omegle.secondary_button"
                  size="sm"
                  onClick={connectToPeer}
                  disabled={!remotePeerId.trim() || isConnecting || !peerReady}
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

            <p className="text-[10px] text-white/30 text-center">
              Share your Room ID with a friend. When they enter it and click
              Connect, you'll be live together.
            </p>
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div className="w-64 flex-col border-l border-white/10 bg-black/40 flex-shrink-0 hidden sm:flex">
          <div className="px-3 py-2 border-b border-white/10 flex-shrink-0">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              Chat
            </h3>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            {messages.length === 0 ? (
              <div
                data-ocid="omegle.empty_state"
                className="text-center py-8 text-white/25 text-xs"
              >
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
              placeholder={
                isConnected ? "Type a message..." : "Connect first..."
              }
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
        </div>
      </div>
    </div>
  );
}
