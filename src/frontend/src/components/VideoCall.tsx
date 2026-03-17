import {
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getAvatarColor, getInitials, useReckon } from "../App";

// ─── Types ────────────────────────────────────────────────────────────────────
type CallState = "idle" | "calling" | "incoming" | "active";

interface SignalData {
  type: "offer" | "answer" | "ice" | "decline" | "end";
  from: string;
  to: string;
  callId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: number;
}

function writeSignal(callId: string, data: SignalData) {
  localStorage.setItem(
    `reckon_signal_${callId}_${data.type}_${data.from}`,
    JSON.stringify(data),
  );
}

function readSignals(callId: string): SignalData[] {
  const result: SignalData[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`reckon_signal_${callId}`)) {
      try {
        const d = JSON.parse(localStorage.getItem(key) ?? "") as SignalData;
        if (Date.now() - d.timestamp < 60000) result.push(d);
        else localStorage.removeItem(key);
      } catch {}
    }
  }
  return result;
}

function clearSignals(callId: string) {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`reckon_signal_${callId}`)) toRemove.push(key!);
  }
  for (const k of toRemove) localStorage.removeItem(k);
}

function findIncomingOffer(userId: string): SignalData | null {
  const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("reckon_signal_") && key.includes("_offer_")) {
      try {
        const d = JSON.parse(localStorage.getItem(key) ?? "") as SignalData;
        if (
          d.to === userId &&
          d.type === "offer" &&
          now - d.timestamp < 30000
        ) {
          return d;
        }
      } catch {}
    }
  }
  return null;
}

// ─── VideoCall Component ──────────────────────────────────────────────────────
export interface VideoCallContextMethods {
  initiateCall: (userId: string) => void;
  endCall: () => void;
  activeCallUserId: string | null;
  incomingCallFrom: string | null;
  acceptCall: () => void;
  declineCall: () => void;
}

interface VideoCallProps {
  onContextReady?: (methods: VideoCallContextMethods) => void;
}

export default function VideoCall({ onContextReady }: VideoCallProps) {
  const { currentUser, allUsers } = useReckon();

  const [callState, setCallState] = useState<CallState>("idle");
  const [activeCallUserId, setActiveCallUserId] = useState<string | null>(null);
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ from: "me" | "remote"; text: string; time: string }>
  >([]);
  const [chatInput, setChatInput] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  callStateRef.current = callState;
  callIdRef.current = currentCallId;

  const callerUser = incomingCallFrom
    ? allUsers.find((u) => u.id === incomingCallFrom)
    : null;
  const remoteUser = activeCallUserId
    ? allUsers.find((u) => u.id === activeCallUserId)
    : null;
  const targetUser =
    callState === "calling"
      ? allUsers.find((u) => u.id === activeCallUserId)
      : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (onContextReady) {
      onContextReady({
        initiateCall,
        endCall,
        activeCallUserId,
        incomingCallFrom,
        acceptCall,
        declineCall,
      });
    }
  }, [activeCallUserId, incomingCallFrom, callState]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      const state = callStateRef.current;
      const callId = callIdRef.current;

      if (state === "idle") {
        const offer = findIncomingOffer(currentUser.id);
        if (offer) {
          setIncomingCallFrom(offer.from);
          setCurrentCallId(offer.callId);
          callIdRef.current = offer.callId;
          setCallState("incoming");
        }
      } else if (state === "calling" && callId) {
        const sigs = readSignals(callId);
        const answer = sigs.find(
          (s) => s.type === "answer" && s.to === currentUser.id,
        );
        const decline = sigs.find(
          (s) => s.type === "decline" && s.to === currentUser.id,
        );
        const end = sigs.find((s) => s.type === "end");
        if (decline || end) {
          cleanupCall();
          return;
        }
        if (answer?.answer && pcRef.current) {
          pcRef.current
            .setRemoteDescription(new RTCSessionDescription(answer.answer))
            .catch(() => {});
          const iceSigs = sigs.filter(
            (s) => s.type === "ice" && s.from !== currentUser.id,
          );
          for (const s of iceSigs) {
            if (s.candidate)
              pcRef.current
                ?.addIceCandidate(new RTCIceCandidate(s.candidate))
                .catch(() => {});
          }
          setCallState("active");
        } else {
          const iceSigs = sigs.filter(
            (s) => s.type === "ice" && s.from !== currentUser.id,
          );
          for (const s of iceSigs) {
            if (s.candidate && pcRef.current?.remoteDescription) {
              pcRef.current
                .addIceCandidate(new RTCIceCandidate(s.candidate))
                .catch(() => {});
            }
          }
        }
      } else if (state === "active" && callId) {
        const sigs = readSignals(callId);
        const end = sigs.find(
          (s) => s.type === "end" && s.from !== currentUser.id,
        );
        if (end) {
          cleanupCall();
          return;
        }
        const iceSigs = sigs.filter(
          (s) => s.type === "ice" && s.from !== currentUser.id,
        );
        for (const s of iceSigs) {
          if (s.candidate && pcRef.current?.remoteDescription) {
            pcRef.current
              .addIceCandidate(new RTCIceCandidate(s.candidate))
              .catch(() => {});
          }
        }
      }
    }, 800);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentUser.id]);

  const getMediaStream = async (): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setCallError(
          "Camera/microphone permission denied. Please allow access and try again.",
        );
      } else {
        setCallError("Could not access camera or microphone.");
      }
      return null;
    }
  };

  const createPC = (callId: string, targetId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        writeSignal(callId, {
          type: "ice",
          from: currentUser.id,
          to: targetId,
          callId,
          candidate: e.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0])
        remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      )
        cleanupCall();
    };
    pc.ondatachannel = (e) => {
      dataChannelRef.current = e.channel;
      e.channel.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          if (parsed.type === "chat") {
            setChatMessages((prev) => [
              ...prev,
              {
                from: "remote",
                text: parsed.text,
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ]);
          }
        } catch {}
      };
    };
    return pc;
  };

  const initiateCall = async (userId: string) => {
    if (callState !== "idle") return;
    setCallError(null);
    const stream = await getMediaStream();
    if (!stream) return;
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const pc = createPC(callId, userId);
    pcRef.current = pc;
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    const dc = pc.createDataChannel("chat");
    dataChannelRef.current = dc;
    dc.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed.type === "chat") {
          setChatMessages((prev) => [
            ...prev,
            {
              from: "remote",
              text: parsed.text,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
        }
      } catch {}
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    writeSignal(callId, {
      type: "offer",
      from: currentUser.id,
      to: userId,
      callId,
      offer: pc.localDescription?.toJSON(),
      timestamp: Date.now(),
    });
    setCurrentCallId(callId);
    callIdRef.current = callId;
    setActiveCallUserId(userId);
    setCallState("calling");
  };

  const acceptCall = async () => {
    const callId = currentCallId;
    const fromId = incomingCallFrom;
    if (!callId || !fromId) return;
    setCallError(null);
    const stream = await getMediaStream();
    if (!stream) return;
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const pc = createPC(callId, fromId);
    pcRef.current = pc;
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    const signals = readSignals(callId);
    const offerSig = signals.find(
      (s) => s.type === "offer" && s.from === fromId,
    );
    if (!offerSig?.offer) {
      setCallError("Could not find call offer. Please try again.");
      cleanupCall();
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription(offerSig.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    writeSignal(callId, {
      type: "answer",
      from: currentUser.id,
      to: fromId,
      callId,
      answer: pc.localDescription?.toJSON(),
      timestamp: Date.now(),
    });
    setActiveCallUserId(fromId);
    setCallState("active");
    startDurationTimer();
  };

  const declineCall = () => {
    const callId = currentCallId;
    const fromId = incomingCallFrom;
    if (callId && fromId) {
      writeSignal(callId, {
        type: "decline",
        from: currentUser.id,
        to: fromId,
        callId,
        timestamp: Date.now(),
      });
      clearSignals(callId);
    }
    setCallState("idle");
    setIncomingCallFrom(null);
    setCurrentCallId(null);
    callIdRef.current = null;
  };

  const endCall = () => {
    const callId = currentCallId ?? callIdRef.current;
    if (callId && activeCallUserId) {
      writeSignal(callId, {
        type: "end",
        from: currentUser.id,
        to: activeCallUserId,
        callId,
        timestamp: Date.now(),
      });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getTracks()) t.stop();
    }
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pcRef.current?.close();
    pcRef.current = null;
    const callId = callIdRef.current;
    if (callId) setTimeout(() => clearSignals(callId), 2000);
    if (durationRef.current) clearInterval(durationRef.current);
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    setCallDuration(0);
    setShowChat(false);
    setChatMessages([]);
    setChatInput("");
    setCallState("idle");
    setActiveCallUserId(null);
    setIncomingCallFrom(null);
    setCurrentCallId(null);
    callIdRef.current = null;
  };

  const startDurationTimer = () => {
    setCallDuration(0);
    durationRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !dataChannelRef.current) return;
    const text = chatInput.trim();
    try {
      dataChannelRef.current.send(JSON.stringify({ type: "chat", text }));
    } catch {}
    setChatMessages((prev) => [
      ...prev,
      {
        from: "me",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks())
        t.enabled = isMuted;
    }
    setIsMuted((m) => !m);
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getVideoTracks())
        t.enabled = isCameraOff;
    }
    setIsCameraOff((c) => !c);
  };

  if (callState === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "oklch(0.05 0.01 270 / 0.95)" }}
      >
        {/* ── Incoming Call Screen ── */}
        {callState === "incoming" && (
          <motion.div
            className="flex flex-col items-center gap-6 text-center px-8"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {/* Animated ring */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid oklch(0.6 0.25 150 / 0.6)" }}
                animate={{ scale: [1, 1.4, 1.4], opacity: [0.8, 0, 0] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid oklch(0.6 0.25 150 / 0.4)" }}
                animate={{ scale: [1, 1.7, 1.7], opacity: [0.6, 0, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: 0.4,
                }}
              />
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white relative z-10"
                style={{ background: getAvatarColor(callerUser?.id ?? "") }}
              >
                {getInitials(callerUser?.name ?? "?")}
              </div>
            </div>

            {/* Name badge with neon glow */}
            <motion.div
              className="px-6 py-3 rounded-2xl"
              style={{
                background: "oklch(0.1 0.02 270 / 0.85)",
                border: "1.5px solid oklch(0.65 0.28 150 / 0.7)",
                boxShadow:
                  "0 0 18px oklch(0.65 0.28 150 / 0.45), 0 0 40px oklch(0.65 0.28 150 / 0.2)",
              }}
              animate={{
                boxShadow: [
                  "0 0 18px oklch(0.65 0.28 150 / 0.45), 0 0 40px oklch(0.65 0.28 150 / 0.2)",
                  "0 0 28px oklch(0.65 0.28 150 / 0.7), 0 0 60px oklch(0.65 0.28 150 / 0.35)",
                  "0 0 18px oklch(0.65 0.28 150 / 0.45), 0 0 40px oklch(0.65 0.28 150 / 0.2)",
                ],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <p className="text-white/60 text-xs mb-0.5 tracking-wider uppercase">
                Incoming Video Call 📹
              </p>
              <h2 className="text-2xl font-bold text-white">
                {callerUser?.name ?? "Unknown"}
              </h2>
              {callerUser?.city && (
                <p className="text-white/50 text-sm mt-1">
                  📍 {callerUser.city}
                </p>
              )}
            </motion.div>

            <div className="flex gap-8">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-ocid="videocall.decline_button"
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: "oklch(0.5 0.25 25)" }}
                  onClick={declineCall}
                >
                  <PhoneOff size={24} className="text-white" />
                </button>
                <span className="text-white/60 text-xs">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-ocid="videocall.accept_button"
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: "oklch(0.55 0.25 150)" }}
                  onClick={acceptCall}
                >
                  <Phone size={24} className="text-white" />
                </button>
                <span className="text-white/60 text-xs">Accept</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Outgoing Call Screen ── */}
        {callState === "calling" && (
          <motion.div
            className="flex flex-col items-center gap-6 text-center px-8"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid oklch(0.65 0.22 200 / 0.5)" }}
                animate={{ scale: [1, 1.5, 1.5], opacity: [0.7, 0, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white relative z-10"
                style={{ background: getAvatarColor(targetUser?.id ?? "") }}
              >
                {getInitials(targetUser?.name ?? "?")}
              </div>
            </div>

            {/* Name badge with neon glow */}
            <motion.div
              className="px-6 py-3 rounded-2xl"
              style={{
                background: "oklch(0.1 0.02 270 / 0.85)",
                border: "1.5px solid oklch(0.65 0.22 200 / 0.7)",
                boxShadow:
                  "0 0 18px oklch(0.65 0.22 200 / 0.45), 0 0 40px oklch(0.65 0.22 200 / 0.2)",
              }}
              animate={{
                boxShadow: [
                  "0 0 18px oklch(0.65 0.22 200 / 0.45), 0 0 40px oklch(0.65 0.22 200 / 0.2)",
                  "0 0 28px oklch(0.65 0.22 200 / 0.7), 0 0 60px oklch(0.65 0.22 200 / 0.35)",
                  "0 0 18px oklch(0.65 0.22 200 / 0.45), 0 0 40px oklch(0.65 0.22 200 / 0.2)",
                ],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <motion.p
                className="text-white/60 text-xs mb-0.5 tracking-wider uppercase"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                Calling...
              </motion.p>
              <h2 className="text-2xl font-bold text-white">
                {targetUser?.name ?? "Unknown"}
              </h2>
              {targetUser?.city && (
                <p className="text-white/50 text-sm mt-1">
                  📍 {targetUser.city}
                </p>
              )}
            </motion.div>

            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                data-ocid="videocall.end_button"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ background: "oklch(0.5 0.25 25)" }}
                onClick={endCall}
              >
                <PhoneOff size={24} className="text-white" />
              </button>
              <span className="text-white/60 text-xs">End Call</span>
            </div>
          </motion.div>
        )}

        {/* ── Active Call Screen ── */}
        {callState === "active" && (
          <div className="relative w-full h-full flex flex-col">
            {/* Remote video (fullscreen bg) */}
            {/* biome-ignore lint/a11y/useMediaCaption: live video call stream has no captions */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ background: "oklch(0.08 0.015 270)" }}
            />

            {/* Dark overlay at top */}
            <div
              className="absolute top-0 left-0 right-0 h-36 z-10"
              style={{
                background:
                  "linear-gradient(to bottom, oklch(0.05 0.01 270 / 0.9), transparent)",
              }}
            />

            {/* Dark overlay at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-40 z-10"
              style={{
                background:
                  "linear-gradient(to top, oklch(0.05 0.01 270 / 0.9), transparent)",
              }}
            />

            {/* Top: prominent user info card */}
            <div className="relative z-20 px-5 pt-6 flex items-center gap-4">
              {/* Large avatar */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{
                  background: getAvatarColor(remoteUser?.id ?? ""),
                  boxShadow: `0 0 16px ${getAvatarColor(remoteUser?.id ?? "")}80`,
                  border: "2px solid rgba(255,255,255,0.25)",
                }}
              >
                {getInitials(remoteUser?.name ?? "?")}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-lg leading-tight">
                    {remoteUser?.name ?? "Unknown"}
                  </p>
                  <button
                    type="button"
                    title="Invite via WhatsApp"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `I'm on a Reckon video call! Join me at ${window.location.href}`,
                      );
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                    style={{
                      background: "rgba(37,211,102,0.25)",
                      border: "1px solid rgba(37,211,102,0.5)",
                      boxShadow: "0 0 8px rgba(37,211,102,0.3)",
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
                  </button>
                </div>
                {remoteUser?.city && (
                  <p className="text-white/60 text-sm">📍 {remoteUser.city}</p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{
                      background: "oklch(0.75 0.22 150)",
                      boxShadow: "0 0 6px oklch(0.75 0.22 150)",
                    }}
                  />
                  <p className="text-white/70 text-xs font-mono">
                    {formatDuration(callDuration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Local video PiP */}
            <div className="absolute bottom-32 right-4 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-28 h-40 sm:w-36 sm:h-48 rounded-xl object-cover"
                style={{
                  border: "2px solid oklch(0.4 0.15 300 / 0.6)",
                  background: "oklch(0.1 0.02 270)",
                  filter: isCameraOff ? "brightness(0.15)" : undefined,
                }}
              />
              {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                  <VideoOff size={20} className="text-white/60" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-center gap-5 pb-8">
              {/* Mute */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  data-ocid="videocall.mute_button"
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: isMuted
                      ? "oklch(0.5 0.25 25)"
                      : "oklch(0.25 0.04 270 / 0.8)",
                    border: "1px solid oklch(0.4 0.08 270 / 0.4)",
                  }}
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <MicOff size={20} className="text-white" />
                  ) : (
                    <Mic size={20} className="text-white" />
                  )}
                </button>
                <span className="text-white/60 text-xs">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
              </div>

              {/* End Call */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  data-ocid="videocall.end_button"
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{ background: "oklch(0.5 0.25 25)" }}
                  onClick={endCall}
                >
                  <PhoneOff size={24} className="text-white" />
                </button>
                <span className="text-white/60 text-xs">End Call</span>
              </div>

              {/* Camera Toggle */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  data-ocid="videocall.camera_toggle"
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: isCameraOff
                      ? "oklch(0.5 0.25 25)"
                      : "oklch(0.25 0.04 270 / 0.8)",
                    border: "1px solid oklch(0.4 0.08 270 / 0.4)",
                  }}
                  onClick={toggleCamera}
                >
                  {isCameraOff ? (
                    <VideoOff size={20} className="text-white" />
                  ) : (
                    <Video size={20} className="text-white" />
                  )}
                </button>
                <span className="text-white/60 text-xs">
                  {isCameraOff ? "Cam Off" : "Camera"}
                </span>
              </div>

              {/* Chat Toggle */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  data-ocid="videocall.toggle"
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 relative"
                  style={{
                    background: showChat
                      ? "oklch(0.45 0.18 220 / 0.9)"
                      : "oklch(0.25 0.04 270 / 0.8)",
                    border: `1px solid ${showChat ? "oklch(0.65 0.22 200 / 0.7)" : "oklch(0.4 0.08 270 / 0.4)"}`,
                  }}
                  onClick={() => setShowChat((v) => !v)}
                >
                  <MessageSquare size={20} className="text-white" />
                  {chatMessages.length > 0 && !showChat && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full text-[9px] text-white flex items-center justify-center">
                      {chatMessages.filter((m) => m.from === "remote").length}
                    </span>
                  )}
                </button>
                <span className="text-white/60 text-xs">Chat</span>
              </div>

              {/* Exit */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  data-ocid="videocall.exit_button"
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{
                    background: "oklch(0.5 0.25 25)",
                    border: "1px solid oklch(0.65 0.25 25 / 0.5)",
                    boxShadow: "0 0 12px oklch(0.5 0.25 25 / 0.5)",
                  }}
                  onClick={endCall}
                >
                  <LogOut size={20} className="text-white" />
                </button>
                <span className="text-white/60 text-xs">Exit</span>
              </div>
            </div>

            {/* Chat Overlay Panel */}
            {showChat && (
              <div
                data-ocid="videocall.panel"
                className="absolute bottom-28 right-4 z-30 w-72 sm:w-80 flex flex-col rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(0,245,255,0.2)",
                  boxShadow:
                    "0 0 30px rgba(0,245,255,0.1), 0 8px 32px rgba(0,0,0,0.6)",
                  maxHeight: "340px",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b"
                  style={{ borderColor: "rgba(0,245,255,0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-white">
                      In-Call Chat
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChat(false)}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-white/70" />
                  </button>
                </div>
                <div
                  className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
                  style={{ minHeight: "160px", maxHeight: "220px" }}
                >
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs text-white/30 py-6">
                      Say hello! 👋
                    </p>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={`${msg.time}-${i}`}
                        className={`flex flex-col gap-0.5 ${msg.from === "me" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className="max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed"
                          style={
                            msg.from === "me"
                              ? {
                                  background:
                                    "linear-gradient(135deg, rgba(255,45,120,0.7), rgba(255,45,120,0.4))",
                                  color: "white",
                                  boxShadow: "0 0 10px rgba(255,45,120,0.3)",
                                  borderBottomRightRadius: "4px",
                                }
                              : {
                                  background: "rgba(0,245,255,0.12)",
                                  color: "rgba(0,245,255,0.9)",
                                  border: "1px solid rgba(0,245,255,0.2)",
                                  borderBottomLeftRadius: "4px",
                                }
                          }
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-white/25">
                          {msg.time}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div
                  className="px-3 py-2 border-t flex gap-2"
                  style={{ borderColor: "rgba(0,245,255,0.15)" }}
                >
                  <input
                    data-ocid="videocall.input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/40"
                  />
                  <button
                    type="button"
                    data-ocid="videocall.submit_button"
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105"
                    style={{
                      background: "rgba(255,45,120,0.3)",
                      border: "1px solid rgba(255,45,120,0.5)",
                    }}
                  >
                    <Send className="w-3.5 h-3.5 text-pink-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {callError && (
          <div
            data-ocid="videocall.error_state"
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm text-white max-w-sm text-center z-[110]"
            style={{ background: "oklch(0.4 0.2 25 / 0.95)" }}
          >
            {callError}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
