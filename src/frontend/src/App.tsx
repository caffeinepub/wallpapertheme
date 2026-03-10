import { Toaster } from "@/components/ui/sonner";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Auth from "./components/Auth";
import ChatPanel from "./components/ChatPanel";
import Footer from "./components/Footer";
import GroupModal from "./components/GroupModal";
import OmegleChat from "./components/OmegleChat";
import OnlineUsers from "./components/OnlineUsers";
import Sidebar from "./components/Sidebar";
import VideoCall, {
  type VideoCallContextMethods,
} from "./components/VideoCall";
import type { ActiveUser, Conversation, Message, User } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "oklch(0.55 0.22 300)",
  "oklch(0.55 0.22 200)",
  "oklch(0.55 0.22 150)",
  "oklch(0.55 0.22 60)",
  "oklch(0.55 0.22 350)",
  "oklch(0.55 0.22 240)",
  "oklch(0.55 0.22 30)",
  "oklch(0.55 0.22 120)",
];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatConvTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

// ─── Demo Data ──────────────────────────────────────────────────────────────────
const DEMO_USERS: User[] = [
  {
    id: "demo_alice",
    name: "Alice Sharma",
    email: "alice@demo.com",
    phone: "+91 9876543210",
    password: "demo123",
    city: "Mumbai",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "demo_bob",
    name: "Bob Patel",
    email: "bob@demo.com",
    phone: "+91 9876543211",
    password: "demo123",
    city: "Delhi",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "demo_carol",
    name: "Carol Nair",
    email: "carol@demo.com",
    phone: "+91 9876543212",
    password: "demo123",
    city: "Bangalore",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "demo_david",
    name: "David Mehta",
    email: "david@demo.com",
    phone: "+91 9876543213",
    password: "demo123",
    city: "Pune",
    createdAt: Date.now() - 86400000,
  },
  {
    id: "demo_eva",
    name: "Eva Singh",
    email: "eva@demo.com",
    phone: "+91 9876543214",
    password: "demo123",
    city: "Hyderabad",
    createdAt: Date.now() - 86400000,
  },
];

function initDemoData(): void {
  if (localStorage.getItem("reckon_demo_init")) return;
  const users: User[] = loadFromStorage("reckon_users", []);
  const demoIds = new Set(DEMO_USERS.map((u) => u.id));
  const filtered = users.filter((u) => !demoIds.has(u.id));
  saveToStorage("reckon_users", [...filtered, ...DEMO_USERS]);
  for (const u of DEMO_USERS) {
    localStorage.setItem(
      `reckon_active_${u.id}`,
      JSON.stringify({
        name: u.name,
        city: u.city,
        lastSeen: Date.now() - Math.floor(Math.random() * 4 * 60 * 1000),
      }),
    );
  }
  localStorage.setItem("reckon_demo_init", "1");
}

function getOnlineUsers(): ActiveUser[] {
  const result: ActiveUser[] = [];
  const fiveMin = Date.now() - 5 * 60 * 1000;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("reckon_active_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) ?? "{}");
        if (data.lastSeen > fiveMin) {
          result.push({ id: key.replace("reckon_active_", ""), ...data });
        }
      } catch {}
    }
  }
  return result.sort((a, b) => b.lastSeen - a.lastSeen);
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface ReckonContextType {
  currentUser: User;
  conversations: Conversation[];
  messages: Message[];
  selectedConvId: string | null;
  setSelectedConvId: (id: string | null) => void;
  addMessage: (msg: Message) => void;
  addConversation: (conv: Conversation) => void;
  allUsers: User[];
  onlineUsers: ActiveUser[];
  logout: () => void;
  refreshData: () => void;
  typingInConvId: string | null;
  setTypingInConvId: (id: string | null) => void;
  mobileView: "sidebar" | "chat";
  setMobileView: (v: "sidebar" | "chat") => void;
  initiateCall: (userId: string) => void;
  endCall: () => void;
  activeCallUserId: string | null;
  incomingCallFrom: string | null;
  acceptCall: () => void;
  declineCall: () => void;
}

export const ReckonContext = createContext<ReckonContextType | null>(null);

export function useReckon(): ReckonContextType {
  const ctx = useContext(ReckonContext);
  if (!ctx) throw new Error("useReckon must be within ReckonContext.Provider");
  return ctx;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    loadFromStorage<User | null>("reckon_current_user", null),
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadFromStorage("reckon_conversations", []),
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    loadFromStorage("reckon_messages", []),
  );
  const [allUsers, setAllUsers] = useState<User[]>(() =>
    loadFromStorage("reckon_users", []),
  );
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<ActiveUser[]>([]);
  const [typingInConvId, setTypingInConvId] = useState<string | null>(null);
  const [showGroup, setShowGroup] = useState(false);
  const [showOmegle, setShowOmegle] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [videoCallMethods, setVideoCallMethods] =
    useState<VideoCallContextMethods>({
      initiateCall: () => {},
      endCall: () => {},
      activeCallUserId: null,
      incomingCallFrom: null,
      acceptCall: () => {},
      declineCall: () => {},
    });

  useEffect(() => {
    initDemoData();
    setAllUsers(loadFromStorage("reckon_users", []));
    setOnlineUsers(getOnlineUsers());
    const stored = loadFromStorage<User | null>("reckon_current_user", null);
    if (stored) detectCity(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const updateActive = () => {
      localStorage.setItem(
        `reckon_active_${currentUser.id}`,
        JSON.stringify({
          name: currentUser.name,
          city: currentUser.city,
          lastSeen: Date.now(),
        }),
      );
      setOnlineUsers(getOnlineUsers());
    };
    updateActive();
    heartbeatRef.current = setInterval(updateActive, 30000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [currentUser]);

  const refreshData = () => {
    setConversations(loadFromStorage("reckon_conversations", []));
    setMessages(loadFromStorage("reckon_messages", []));
    setAllUsers(loadFromStorage("reckon_users", []));
    setOnlineUsers(getOnlineUsers());
  };

  const detectCity = async (user: User) => {
    if (user.city || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
        );
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          "";
        if (city) {
          const updated = { ...user, city };
          saveToStorage("reckon_current_user", updated);
          setCurrentUser(updated);
          const users = loadFromStorage<User[]>("reckon_users", []);
          const idx = users.findIndex((u) => u.id === user.id);
          if (idx >= 0) {
            users[idx] = updated;
            saveToStorage("reckon_users", users);
          }
        }
      } catch {}
    });
  };

  const handleLogin = (user: User) => {
    saveToStorage("reckon_current_user", user);
    setCurrentUser(user);
    detectCity(user);
  };

  const logout = () => {
    localStorage.removeItem("reckon_current_user");
    if (currentUser) localStorage.removeItem(`reckon_active_${currentUser.id}`);
    setCurrentUser(null);
    setSelectedConvId(null);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
  };

  const addMessage = (msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveToStorage("reckon_messages", next);
      return next;
    });
  };

  const addConversation = (conv: Conversation) => {
    setConversations((prev) => {
      const next = [...prev, conv];
      saveToStorage("reckon_conversations", next);
      return next;
    });
  };

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  const ctx: ReckonContextType = {
    currentUser,
    conversations,
    messages,
    selectedConvId,
    setSelectedConvId: (id) => {
      setSelectedConvId(id);
      if (id) setMobileView("chat");
    },
    addMessage,
    addConversation,
    allUsers,
    onlineUsers,
    logout,
    refreshData,
    typingInConvId,
    setTypingInConvId,
    mobileView,
    setMobileView,
    initiateCall: videoCallMethods.initiateCall,
    endCall: videoCallMethods.endCall,
    activeCallUserId: videoCallMethods.activeCallUserId,
    incomingCallFrom: videoCallMethods.incomingCallFrom,
    acceptCall: videoCallMethods.acceptCall,
    declineCall: videoCallMethods.declineCall,
  };

  return (
    <ReckonContext.Provider value={ctx}>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, oklch(0.18 0.08 300 / 0.3), transparent), radial-gradient(ellipse 60% 50% at 80% 100%, oklch(0.16 0.06 200 / 0.25), transparent), oklch(0.08 0.015 270)",
        }}
      >
        {/* App Header with Omegle button */}
        <header
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{
            background: "rgba(8,5,20,0.85)",
            borderBottom: "1px solid rgba(200,80,255,0.2)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 1px 20px rgba(180,60,255,0.1)",
          }}
        >
          <div className="flex items-center gap-2">
            <img
              src="/assets/uploads/Reckon-Messenger-Log-1.png"
              alt="Reckon"
              className="h-7 object-contain"
            />
            <span
              className="text-sm font-bold hidden sm:block"
              style={{
                color: "rgba(220,180,255,0.85)",
                letterSpacing: "0.05em",
              }}
            >
              Reckon
            </span>
          </div>
          <button
            type="button"
            data-ocid="header.omegle_button"
            onClick={() => setShowOmegle(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, rgba(220,50,120,0.25), rgba(140,40,220,0.25))",
              border: "1px solid rgba(200,80,255,0.4)",
              color: "rgba(240,180,255,0.95)",
              boxShadow: "0 0 20px rgba(180,60,255,0.2)",
            }}
          >
            🎥 <span>Omegle</span>
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className={`${
              mobileView === "sidebar" ? "flex" : "hidden"
            } md:flex flex-col w-full md:w-72 lg:w-80 flex-shrink-0 border-r border-border/40`}
          >
            <Sidebar onNewGroup={() => setShowGroup(true)} />
          </div>

          {/* Chat panel */}
          <div
            className={`${
              mobileView === "chat" ? "flex" : "hidden"
            } md:flex flex-1 flex-col overflow-hidden`}
          >
            <ChatPanel />
          </div>

          {/* Online users - desktop only */}
          <div className="hidden lg:flex flex-col w-56 xl:w-64 flex-shrink-0 border-l border-border/40">
            <OnlineUsers />
          </div>
        </div>

        <Footer />

        {showGroup && (
          <GroupModal
            onClose={() => setShowGroup(false)}
            onCreated={(conv) => {
              addConversation(conv);
              setSelectedConvId(conv.id);
              setMobileView("chat");
              setShowGroup(false);
            }}
          />
        )}

        {/* Omegle Video Chat */}
        <OmegleChat open={showOmegle} onClose={() => setShowOmegle(false)} />

        {/* Video Call Overlay */}
        <VideoCall onContextReady={setVideoCallMethods} />

        <Toaster position="top-center" richColors />
      </div>
    </ReckonContext.Provider>
  );
}
