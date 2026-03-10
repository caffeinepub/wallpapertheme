import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
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
        // Ignore stale signals older than 60s
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

// Scan all signals looking for an incoming offer for a specific user
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");

  // Keep ref in sync
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

  // Expose context methods
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - expose updated closures
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

  // Poll for incoming calls + signals
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - stable poll using refs
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
            if (s.candidate) {
              pcRef.current
                ?.addIceCandidate(new RTCIceCandidate(s.candidate))
                .catch(() => {});
            }
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      return stream;
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
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        cleanupCall();
      }
    };

    return pc;
  };

  const initiateCall = async (userId: string) => {
    if (callState !== "idle") return;
    setCallError(null);

    const stream = await getMediaStream();
    if (!stream) return;

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const pc = createPC(callId, userId);
    pcRef.current = pc;

    for (const track of stream.getTracks()) pc.addTrack(track, stream);

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
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

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
    setCallDuration(0);

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

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks()) {
        t.enabled = isMuted;
      }
    }
    setIsMuted((m) => !m);
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getVideoTracks()) {
        t.enabled = isCameraOff;
      }
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

            <div>
              <p className="text-white/60 text-sm mb-1">
                Incoming Video Call 📹
              </p>
              <h2 className="text-2xl font-bold text-white">
                {callerUser?.name ?? "Unknown"}
              </h2>
              {callerUser?.city && (
                <p className="text-white/50 text-sm mt-1">{callerUser.city}</p>
              )}
            </div>

            <div className="flex gap-8">
              <button
                type="button"
                data-ocid="videocall.decline_button"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ background: "oklch(0.5 0.25 25)" }}
                onClick={declineCall}
              >
                <PhoneOff size={24} className="text-white" />
              </button>
              <button
                type="button"
                data-ocid="videocall.accept_button"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ background: "oklch(0.55 0.25 150)" }}
                onClick={acceptCall}
              >
                <Phone size={24} className="text-white" />
              </button>
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

            <div>
              <motion.p
                className="text-white/60 text-sm mb-1"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                Calling...
              </motion.p>
              <h2 className="text-2xl font-bold text-white">
                {targetUser?.name ?? "Unknown"}
              </h2>
              {targetUser?.city && (
                <p className="text-white/50 text-sm mt-1">{targetUser.city}</p>
              )}
            </div>

            <button
              type="button"
              data-ocid="videocall.end_button"
              className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ background: "oklch(0.5 0.25 25)" }}
              onClick={endCall}
            >
              <PhoneOff size={24} className="text-white" />
            </button>
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
              className="absolute top-0 left-0 right-0 h-24 z-10"
              style={{
                background:
                  "linear-gradient(to bottom, oklch(0.05 0.01 270 / 0.8), transparent)",
              }}
            />

            {/* Dark overlay at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-36 z-10"
              style={{
                background:
                  "linear-gradient(to top, oklch(0.05 0.01 270 / 0.9), transparent)",
              }}
            />

            {/* Top: caller name + duration */}
            <div className="relative z-20 px-6 pt-6 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: getAvatarColor(remoteUser?.id ?? "") }}
              >
                {getInitials(remoteUser?.name ?? "?")}
              </div>
              <div>
                <p className="text-white font-semibold">
                  {remoteUser?.name ?? "Unknown"}
                </p>
                <p className="text-white/60 text-sm">
                  {formatDuration(callDuration)}
                </p>
              </div>
            </div>

            {/* Local video PiP */}
            <div className="absolute bottom-28 right-4 z-20">
              {/* biome-ignore lint/a11y/useMediaCaption: local preview, no captions needed */}
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
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-6 pb-8">
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

              <button
                type="button"
                data-ocid="videocall.end_button"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ background: "oklch(0.5 0.25 25)" }}
                onClick={endCall}
              >
                <PhoneOff size={24} className="text-white" />
              </button>

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
            </div>
          </div>
        )}

        {/* Error */}
        {callError && (
          <div
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
