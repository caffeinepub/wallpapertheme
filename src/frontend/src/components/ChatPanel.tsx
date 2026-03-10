import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  File,
  ImageIcon,
  Paperclip,
  Send,
  Smile,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  formatTime,
  genId,
  getAvatarColor,
  getInitials,
  useReckon,
} from "../App";
import type { Conversation, Message, User } from "../types";
import EmojiPicker from "./EmojiPicker";
import OnlineUsers from "./OnlineUsers";

function getConvName(
  conv: Conversation,
  currentUserId: string,
  allUsers: User[],
): string {
  if (conv.isGroup) return conv.name ?? "Group";
  const other = conv.members.find((id) => id !== currentUserId);
  return allUsers.find((u) => u.id === other)?.name ?? "Unknown";
}

function getConvPartnerId(
  conv: Conversation,
  currentUserId: string,
): string | null {
  if (conv.isGroup) return null;
  return conv.members.find((id) => id !== currentUserId) ?? null;
}

export default function ChatPanel() {
  const {
    currentUser,
    conversations,
    messages,
    selectedConvId,
    addMessage,
    allUsers,
    onlineUsers,
    setSelectedConvId,
    typingInConvId,
    setTypingInConvId,
    setMobileView,
    initiateCall,
  } = useReckon();

  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMobileOnline, setShowMobileOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conv = conversations.find((c) => c.id === selectedConvId) ?? null;
  const convMessages = messages
    .filter((m) => m.conversationId === selectedConvId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const partnerId = conv ? getConvPartnerId(conv, currentUser.id) : null;
  const partnerUser = partnerId
    ? allUsers.find((u) => u.id === partnerId)
    : null;
  const isPartnerOnline = partnerId
    ? onlineUsers.some((u) => u.id === partnerId)
    : false;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convMessages.length, selectedConvId]);

  const triggerPartnerTyping = (
    convId: string,
    partner: User | undefined,
    isOnline: boolean,
  ) => {
    if (!partner || !isOnline) return;
    setTimeout(() => {
      setPartnerTyping(true);
      setTypingInConvId(convId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setPartnerTyping(false);
        setTypingInConvId(null);
      }, 2500);
    }, 800);
  };

  const sendMessage = (
    content: string,
    fileName?: string,
    fileData?: string,
    fileType?: string,
  ) => {
    if (!conv || !selectedConvId) return;
    const msg: Message = {
      id: genId(),
      conversationId: selectedConvId,
      senderId: currentUser.id,
      text: content,
      timestamp: Date.now(),
      seen: false,
      ...(fileName && { fileName, fileData, fileType }),
    };
    addMessage(msg);
    setText("");
    setShowEmoji(false);
    triggerPartnerTyping(
      selectedConvId,
      partnerUser ?? undefined,
      isPartnerOnline,
    );
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Max 2MB for storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      sendMessage("", file.name, data, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!conv) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 px-8 relative">
        <div className="lg:hidden absolute top-4 right-4">
          <button
            type="button"
            className="flex gap-1 items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg bg-secondary/40"
            onClick={() => setShowMobileOnline((v) => !v)}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Active
          </button>
          {showMobileOnline && (
            <div className="absolute right-0 top-8 z-50 w-56 glass-panel rounded-xl shadow-lg">
              <OnlineUsers compact />
            </div>
          )}
        </div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.35 0.2 300 / 0.3), oklch(0.35 0.18 200 / 0.2))",
              border: "1px solid oklch(0.45 0.2 300 / 0.3)",
            }}
          >
            <span className="text-4xl">💬</span>
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">
            Your Messages
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Select a conversation or start a new chat to begin messaging
          </p>
        </motion.div>
      </div>
    );
  }

  const convName = getConvName(conv, currentUser.id, allUsers);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0"
        style={{ background: "oklch(0.1 0.018 270 / 0.8)" }}
      >
        <button
          type="button"
          className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            setSelectedConvId(null);
            setMobileView("sidebar");
          }}
        >
          <ArrowLeft size={18} />
        </button>

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
              : getInitials(convName)}
          </div>
          {isPartnerOnline && !conv.isGroup && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
              style={{ background: "#22c55e" }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{convName}</p>
          <p className="text-xs">
            {partnerTyping ? (
              <span
                className="flex items-center gap-1"
                style={{ color: "oklch(0.65 0.22 200)" }}
              >
                typing
                <span className="inline-flex gap-0.5">
                  <span
                    className="typing-dot w-1 h-1 rounded-full inline-block"
                    style={{ background: "oklch(0.65 0.22 200)" }}
                  />
                  <span
                    className="typing-dot w-1 h-1 rounded-full inline-block"
                    style={{ background: "oklch(0.65 0.22 200)" }}
                  />
                  <span
                    className="typing-dot w-1 h-1 rounded-full inline-block"
                    style={{ background: "oklch(0.65 0.22 200)" }}
                  />
                </span>
              </span>
            ) : conv.isGroup ? (
              <span className="text-muted-foreground">
                {conv.members.length} members
              </span>
            ) : isPartnerOnline ? (
              <span style={{ color: "#22c55e" }}>Online</span>
            ) : (
              <span className="text-muted-foreground">
                {partnerUser?.city ?? "Offline"}
              </span>
            )}
          </p>
        </div>

        {/* Video Call button — only for direct chats */}
        {!conv.isGroup && partnerId && (
          <button
            type="button"
            data-ocid="chat.video_call_button"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "oklch(0.65 0.22 200)" }}
            onClick={() => initiateCall(partnerId)}
            title={`Video call ${convName}`}
          >
            <Video size={18} />
          </button>
        )}

        <div className="lg:hidden relative">
          <button
            type="button"
            className="flex gap-1 items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg bg-secondary/40"
            onClick={() => setShowMobileOnline((v) => !v)}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>{onlineUsers.length}</span>
          </button>
          {showMobileOnline && (
            <div className="absolute right-0 top-10 z-50 w-56 glass-panel rounded-xl shadow-lg">
              <OnlineUsers compact />
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        data-ocid="chat.message_list"
      >
        <AnimatePresence>
          {convMessages.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-muted-foreground">
                No messages yet. Say hello! 👋
              </p>
            </motion.div>
          ) : (
            convMessages.map((msg, idx) => {
              const isMine = msg.senderId === currentUser.id;
              const senderUser = allUsers.find((u) => u.id === msg.senderId);
              const senderName = senderUser?.name ?? "Unknown";

              return (
                <motion.div
                  key={msg.id}
                  data-ocid={`chat.message_item.${idx + 1}`}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} gap-2`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {!isMine && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-auto"
                      style={{ background: getAvatarColor(msg.senderId) }}
                    >
                      {getInitials(senderName)}
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}
                  >
                    {conv.isGroup && !isMine && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        {senderName}
                      </span>
                    )}
                    <div
                      className={`px-3 py-2 ${isMine ? "msg-sent" : "msg-received"}`}
                    >
                      {msg.fileName ? (
                        <div className="flex items-center gap-2">
                          {msg.fileType?.startsWith("image/") ? (
                            <ImageIcon
                              size={14}
                              className="text-white/70 flex-shrink-0"
                            />
                          ) : (
                            <File
                              size={14}
                              className="text-white/70 flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white/90 truncate max-w-[160px]">
                              {msg.fileName}
                            </p>
                            {msg.fileData &&
                              msg.fileType?.startsWith("image/") && (
                                <img
                                  src={msg.fileData}
                                  alt={msg.fileName}
                                  className="mt-1.5 max-w-[180px] rounded-lg object-cover"
                                />
                              )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white leading-relaxed break-words">
                          {msg.text}
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-1 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </span>
                      {isMine &&
                        (msg.seen ? (
                          <CheckCheck
                            size={12}
                            style={{ color: "oklch(0.65 0.22 200)" }}
                          />
                        ) : (
                          <Check size={12} className="text-muted-foreground" />
                        ))}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        <AnimatePresence>
          {partnerTyping && typingInConvId === selectedConvId && (
            <motion.div
              key="typing"
              className="flex justify-start gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: getAvatarColor(partnerId ?? "") }}
              >
                {getInitials(partnerUser?.name ?? "?")}
              </div>
              <div className="msg-received px-4 py-3 flex items-center gap-1">
                <span
                  className="typing-dot w-2 h-2 rounded-full"
                  style={{ background: "oklch(0.65 0.18 270)" }}
                />
                <span
                  className="typing-dot w-2 h-2 rounded-full"
                  style={{ background: "oklch(0.65 0.18 270)" }}
                />
                <span
                  className="typing-dot w-2 h-2 rounded-full"
                  style={{ background: "oklch(0.65 0.18 270)" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            className="absolute bottom-16 left-0 right-0 z-30 px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="glass-panel rounded-xl p-3 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Emojis
                </span>
                <button type="button" onClick={() => setShowEmoji(false)}>
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
              <EmojiPicker onSelect={(emoji) => setText((t) => t + emoji)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-4 py-3 border-t border-border/40"
        style={{ background: "oklch(0.1 0.018 270 / 0.8)" }}
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            data-ocid="chat.emoji_button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex-shrink-0"
            onClick={() => setShowEmoji((v) => !v)}
          >
            <Smile size={18} />
          </button>
          <button
            type="button"
            data-ocid="chat.upload_button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="flex-1">
            <textarea
              data-ocid="chat.message_input"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full resize-none rounded-xl px-4 py-2.5 text-sm bg-secondary/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              style={{ minHeight: "40px", maxHeight: "120px" }}
            />
          </div>
          <Button
            data-ocid="chat.send_button"
            size="icon"
            className="rounded-xl h-10 w-10 flex-shrink-0"
            style={{
              background: text.trim()
                ? "linear-gradient(135deg, oklch(0.48 0.24 300), oklch(0.45 0.2 260))"
                : "oklch(0.2 0.03 270)",
            }}
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <Send size={16} className="text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
