import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Gamepad2,
  Grid3X3,
  LogOut,
  MapPin,
  MessageCirclePlus,
  Search,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  formatConvTime,
  genId,
  getAvatarColor,
  getInitials,
  useReckon,
} from "../App";
import type { Conversation, User } from "../types";
import LudoGame from "./LudoGame";
import TicTacToe3D from "./TicTacToe3D";

interface SidebarProps {
  onNewGroup: () => void;
}

function getDirectConvName(
  conv: Conversation,
  currentUserId: string,
  allUsers: User[],
): string {
  if (conv.isGroup) return conv.name ?? "Group";
  const otherId = conv.members.find((id) => id !== currentUserId);
  if (!otherId) return "Unknown";
  const user = allUsers.find((u) => u.id === otherId);
  return user?.name ?? "Unknown";
}

function getDirectConvPartnerId(
  conv: Conversation,
  currentUserId: string,
): string | null {
  if (conv.isGroup) return null;
  return conv.members.find((id) => id !== currentUserId) ?? null;
}

export default function Sidebar({ onNewGroup }: SidebarProps) {
  const {
    currentUser,
    conversations,
    messages,
    selectedConvId,
    setSelectedConvId,
    allUsers,
    onlineUsers,
    logout,
    addConversation,
  } = useReckon();

  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showLudo, setShowLudo] = useState(false);
  const [showTtt, setShowTtt] = useState(false);

  const onlineIds = new Set(onlineUsers.map((u) => u.id));

  const filteredConvs = conversations.filter((c) => {
    const name = getDirectConvName(c, currentUser.id, allUsers).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const getLastMessage = (convId: string) => {
    const msgs = messages.filter((m) => m.conversationId === convId);
    if (!msgs.length) return null;
    return msgs[msgs.length - 1];
  };

  const getUnreadCount = (convId: string) => {
    return messages.filter(
      (m) =>
        m.conversationId === convId && m.senderId !== currentUser.id && !m.seen,
    ).length;
  };

  const otherUsers = allUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      u.name.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const startChat = (user: User) => {
    const existingConv = conversations.find(
      (c) =>
        !c.isGroup &&
        c.members.includes(user.id) &&
        c.members.includes(currentUser.id),
    );
    if (existingConv) {
      setSelectedConvId(existingConv.id);
    } else {
      const newConv: Conversation = {
        id: genId(),
        isGroup: false,
        members: [currentUser.id, user.id],
        createdAt: Date.now(),
      };
      addConversation(newConv);
      setSelectedConvId(newConv.id);
    }
    setShowNewChat(false);
    setUserSearch("");
  };

  const sortedConvs = [...filteredConvs].sort((a, b) => {
    const aLast = getLastMessage(a.id);
    const bLast = getLastMessage(b.id);
    const aTime = aLast?.timestamp ?? a.createdAt;
    const bTime = bLast?.timestamp ?? b.createdAt;
    return bTime - aTime;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo + user */}
      <div className="px-4 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2 mb-4">
          <img
            src="/assets/uploads/Reckon-Messenger-Log-1.png"
            alt="Reckon"
            className="h-10 object-contain"
          />
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: getAvatarColor(currentUser.id) }}
          >
            {getInitials(currentUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{currentUser.name}</p>
            {currentUser.city ? (
              <p
                className="text-xs flex items-center gap-1 truncate"
                style={{ color: "oklch(0.72 0.22 350)" }}
              >
                <MapPin
                  size={11}
                  style={{ color: "oklch(0.72 0.22 350)", flexShrink: 0 }}
                />
                {currentUser.city}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground truncate">
                {currentUser.email ?? currentUser.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            data-ocid="chat.search_input"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 flex gap-2">
        <Button
          data-ocid="chat.new_chat_button"
          size="sm"
          variant="secondary"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => setShowNewChat(true)}
        >
          <MessageCirclePlus size={13} />
          New Chat
        </Button>
        <Button
          data-ocid="chat.new_group_button"
          size="sm"
          variant="secondary"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={onNewGroup}
        >
          <Users size={13} />
          New Group
        </Button>
        <Button
          data-ocid="sidebar.ludo_button"
          size="sm"
          variant="secondary"
          className="h-8 px-2"
          onClick={() => setShowLudo(true)}
          title="Play Ludo"
        >
          <Gamepad2 size={13} />
        </Button>
        <Button
          data-ocid="sidebar.ttt_button"
          size="sm"
          variant="secondary"
          className="h-8 px-2"
          onClick={() => setShowTtt(true)}
          title="Tic-Tac-Toe"
        >
          <Grid3X3 size={13} />
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1 px-1">
        <div
          data-ocid="chat.conversation_list"
          className="space-y-0.5 px-2 pb-4"
        >
          <AnimatePresence>
            {sortedConvs.length === 0 ? (
              <div className="text-center py-10">
                <MessageCirclePlus
                  size={32}
                  className="mx-auto mb-3 text-muted-foreground/40"
                />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Start a new chat above
                </p>
              </div>
            ) : (
              sortedConvs.map((conv, idx) => {
                const name = getDirectConvName(conv, currentUser.id, allUsers);
                const partnerId = getDirectConvPartnerId(conv, currentUser.id);
                const isOnline = partnerId ? onlineIds.has(partnerId) : false;
                const lastMsg = getLastMessage(conv.id);
                const unread = getUnreadCount(conv.id);
                const isSelected = selectedConvId === conv.id;

                return (
                  <motion.button
                    key={conv.id}
                    type="button"
                    data-ocid={`chat.conversation_item.${idx + 1}`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg, oklch(0.4 0.18 300 / 0.4), oklch(0.38 0.15 260 / 0.3))"
                        : "transparent",
                      border: isSelected
                        ? "1px solid oklch(0.5 0.2 300 / 0.3)"
                        : "1px solid transparent",
                    }}
                    onClick={() => setSelectedConvId(conv.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{
                      backgroundColor: "oklch(0.18 0.03 270 / 0.6)",
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{
                          background: getAvatarColor(
                            conv.isGroup ? conv.id : (partnerId ?? conv.id),
                          ),
                        }}
                      >
                        {conv.isGroup
                          ? (conv.name?.[0] ?? "G").toUpperCase()
                          : getInitials(name)}
                      </div>
                      {isOnline && (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
                          style={{ background: "#22c55e" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {lastMsg && (
                          <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">
                            {formatConvTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {lastMsg
                            ? lastMsg.fileName
                              ? `📎 ${lastMsg.fileName}`
                              : lastMsg.text
                            : conv.isGroup
                              ? "Group created"
                              : "Start chatting!"}
                        </p>
                        {unread > 0 && (
                          <span
                            className="ml-1 flex-shrink-0 text-[10px] font-bold text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
                            style={{ background: "oklch(0.55 0.24 300)" }}
                          >
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* New Chat Dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="glass-panel border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">New Conversation</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-8 text-sm bg-secondary/50"
              autoFocus
            />
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {otherUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : (
              otherUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-left"
                  onClick={() => startChat(user)}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 relative"
                    style={{ background: getAvatarColor(user.id) }}
                  >
                    {getInitials(user.name)}
                    {onlineIds.has(user.id) && (
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
                        style={{ background: "#22c55e" }}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    {user.city && (
                      <p
                        className="text-xs flex items-center gap-1"
                        style={{ color: "oklch(0.72 0.22 350)" }}
                      >
                        <MapPin
                          size={10}
                          style={{ color: "oklch(0.72 0.22 350)" }}
                        />
                        {user.city}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ludo Game */}
      <LudoGame open={showLudo} onClose={() => setShowLudo(false)} />

      {/* Tic-Tac-Toe */}
      <TicTacToe3D open={showTtt} onClose={() => setShowTtt(false)} />
    </div>
  );
}
