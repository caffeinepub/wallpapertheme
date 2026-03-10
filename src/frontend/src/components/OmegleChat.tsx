import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface OmegleChatProps {
  open: boolean;
  onClose: () => void;
}

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
];

interface ChatMsg {
  from: "You" | "Stranger";
  text: string;
  ts: number;
}

export default function OmegleChat({ open, onClose }: OmegleChatProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const strangerVideoRef = useRef<HTMLVideoElement>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const connectedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const connectStranger = useCallback(() => {
    setConnected(false);
    connectedRef.current = false;
    setConnecting(true);
    setMessages([]);
    if (strangerVideoRef.current) strangerVideoRef.current.srcObject = null;
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    const delay = 2000 + Math.random() * 1500;
    connectTimerRef.current = setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      connectedRef.current = true;
      if (strangerVideoRef.current && streamRef.current) {
        strangerVideoRef.current.srcObject = streamRef.current;
      }
    }, delay);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch {
      // camera permission denied, continue without
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera().then(() => connectStranger());
    } else {
      stopCamera();
      setConnected(false);
      setConnecting(false);
      setMessages([]);
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    }
    return () => {
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, [open, startCamera, connectStranger, stopCamera]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll ref only
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMsg = {
      from: "You",
      text: chatInput.trim(),
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
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

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="flex flex-col md:flex-row w-full h-full"
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
        >
          {/* Video Section */}
          <div className="flex-1 relative flex flex-col">
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(10,10,30,0.9), rgba(20,5,40,0.9))",
                borderBottom: "1px solid rgba(200,100,255,0.2)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🎥</span>
                <span
                  className="font-bold text-white text-lg tracking-wide"
                  style={{ textShadow: "0 0 15px rgba(200,100,255,0.7)" }}
                >
                  Omegle Chat
                </span>
                {connected && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: "rgba(34,197,94,0.2)",
                      color: "#86efac",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }}
                  >
                    Connected
                  </span>
                )}
                {connecting && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
                    style={{
                      background: "rgba(234,179,8,0.2)",
                      color: "#fde047",
                      border: "1px solid rgba(234,179,8,0.3)",
                    }}
                  >
                    Connecting...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="omegle.next_button"
                  onClick={connectStranger}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))",
                    border: "1px solid rgba(168,85,247,0.5)",
                    color: "#c4b5fd",
                    boxShadow: "0 0 12px rgba(168,85,247,0.2)",
                  }}
                >
                  ⏭ Next
                </button>
                <button
                  type="button"
                  data-ocid="omegle.stop_button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#fca5a5",
                  }}
                >
                  ⏹ Stop
                </button>
              </div>
            </div>

            {/* Stranger Video */}
            <div
              className="flex-1 relative overflow-hidden"
              style={{ background: "#050510" }}
            >
              {connecting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <div
                    className="w-full h-full absolute"
                    style={{
                      background:
                        "linear-gradient(135deg, #0d0d2b, #1a0530, #0a1540)",
                    }}
                  />
                  <div className="relative z-10 text-center">
                    <motion.div
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{
                        border: "2px solid rgba(200,100,255,0.5)",
                        background: "rgba(120,40,255,0.1)",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <span className="text-2xl">👤</span>
                    </motion.div>
                    <p className="text-white/70 text-sm font-medium">
                      Connecting to stranger...
                    </p>
                    <div className="flex gap-1 justify-center mt-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ background: "rgba(200,100,255,0.6)" }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {connected && (
                <>
                  <video
                    ref={strangerVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <div
                    className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(34,197,94,0.3)",
                      border: "1px solid rgba(34,197,94,0.4)",
                      color: "#86efac",
                    }}
                  >
                    🟢 Stranger Connected
                  </div>
                </>
              )}

              {/* Local video PiP */}
              <div
                className="absolute bottom-4 right-4 rounded-xl overflow-hidden"
                style={{
                  width: "120px",
                  height: "90px",
                  border: "2px solid rgba(200,100,255,0.5)",
                  boxShadow: "0 0 20px rgba(160,80,255,0.3)",
                  background: "#000",
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div
                  className="absolute bottom-1 left-1 text-[9px] px-1 rounded"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  You
                </div>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div
            className="flex flex-col w-full md:w-72 flex-shrink-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,5,25,0.95), rgba(15,5,35,0.95))",
              borderLeft: "1px solid rgba(200,100,255,0.2)",
            }}
          >
            <div
              className="px-4 py-3 border-b font-semibold text-sm text-white/80"
              style={{ borderColor: "rgba(200,100,255,0.15)" }}
            >
              💬 Chat
            </div>
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2"
              style={{ maxHeight: "calc(100vh - 120px)" }}
            >
              {messages.length === 0 ? (
                <p className="text-xs text-white/30 text-center mt-4">
                  No messages yet...
                </p>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    // biome-ignore lint/suspicious/noArrayIndexKey: message list is append-only
                    key={i}
                    className={`flex ${
                      msg.from === "You" ? "justify-end" : "justify-start"
                    }`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className="max-w-[85%] px-3 py-1.5 rounded-xl text-xs"
                      style={{
                        background:
                          msg.from === "You"
                            ? "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(168,85,247,0.4))"
                            : "rgba(255,255,255,0.08)",
                        border:
                          msg.from === "You"
                            ? "1px solid rgba(168,85,247,0.3)"
                            : "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.9)",
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
            <div
              className="p-3 border-t flex gap-2"
              style={{ borderColor: "rgba(200,100,255,0.15)" }}
            >
              <input
                data-ocid="omegle.chat_input"
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(200,100,255,0.25)",
                  color: "white",
                }}
              />
              <button
                type="button"
                data-ocid="omegle.send_button"
                onClick={sendMessage}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "white",
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
