import { Toaster } from "@/components/ui/sonner";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Auth from "./components/Auth";
import ChatPanel from "./components/ChatPanel";
import Footer from "./components/Footer";
import GroupModal from "./components/GroupModal";
import OnlineUsers from "./components/OnlineUsers";
import Sidebar from "./components/Sidebar";
import SupportModal from "./components/SupportModal";
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
  const [showSupport, setShowSupport] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Video call state — managed by VideoCall component, surfaced here for context
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
    // Detect city for returning users too
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

        {/* Floating WhatsApp support button — hidden when user is typing */}
        {typingInConvId === null && (
          <button
            type="button"
            data-ocid="support.open_modal_button"
            className="fixed bottom-16 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-110 active:scale-95"
            style={{ background: "#25D366" }}
            onClick={() => setShowSupport(true)}
            aria-label="Help & Support"
          >
            <svg
              viewBox="0 0 24 24"
              fill="white"
              className="w-6 h-6"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </button>
        )}

        {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

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

        {/* Video Call Overlay — mounted always, manages its own visibility */}
        <VideoCall onContextReady={setVideoCallMethods} />

        <Toaster position="top-center" richColors />
      </div>
    </ReckonContext.Provider>
  );
}
