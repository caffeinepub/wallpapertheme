import { MapPin, Wifi } from "lucide-react";
import { motion } from "motion/react";
import { getAvatarColor, getInitials, useReckon } from "../App";

interface OnlineUsersProps {
  compact?: boolean;
}

function getStatusInfo(lastSeen: number): {
  color: string;
  label: string;
  glow: string;
} {
  const diff = Date.now() - lastSeen;
  const mins = Math.floor(diff / 60000);
  if (diff < 120000) {
    return {
      color: "#22c55e",
      label: diff < 60000 ? "just now" : "1m ago",
      glow: "#22c55e",
    };
  }
  if (diff < 600000) {
    return { color: "#f59e0b", label: `${mins}m ago`, glow: "#f59e0b" };
  }
  return { color: "#6b7280", label: `${mins}m ago`, glow: "#6b7280" };
}

export default function OnlineUsers({ compact = false }: OnlineUsersProps) {
  const { onlineUsers, currentUser, allUsers } = useReckon();

  const onlineIds = new Set(onlineUsers.map((u) => u.id));
  const onlineMap = new Map(onlineUsers.map((u) => [u.id, u]));

  const allVisible = [...onlineUsers.filter((u) => u.id !== currentUser.id)];
  for (const u of allUsers) {
    if (u.id !== currentUser.id && !onlineIds.has(u.id)) {
      allVisible.push({
        id: u.id,
        name: u.name,
        city: u.city ?? "",
        lastSeen: 0,
      });
    }
  }

  const activeCount = onlineUsers.filter((u) => u.id !== currentUser.id).length;

  return (
    <div className={`flex flex-col h-full ${compact ? "max-h-72" : ""}`}>
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Wifi size={14} style={{ color: "#22c55e" }} />
          <span className="text-sm font-semibold">Users</span>
          <span
            className="ml-auto text-xs font-bold text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
            style={{ background: "#22c55e" }}
          >
            {activeCount}
          </span>
        </div>
      </div>

      {/* List */}
      <div
        data-ocid="users.active_list"
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
      >
        {allVisible.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No users found
          </p>
        ) : (
          allVisible.map((user, idx) => {
            const isOnline = onlineIds.has(user.id);
            const onlineData = onlineMap.get(user.id);
            const status =
              isOnline && onlineData
                ? getStatusInfo(onlineData.lastSeen)
                : { color: "#6b7280", label: "offline", glow: "#6b7280" };

            return (
              <motion.div
                key={user.id}
                data-ocid={`users.active_item.${idx + 1}`}
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-200 cursor-default group"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ backgroundColor: "oklch(0.18 0.03 270 / 0.6)" }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: getAvatarColor(user.id) }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background"
                    style={{
                      background: status.color,
                      boxShadow: isOnline ? `0 0 6px ${status.glow}` : "none",
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.name}</p>
                  {user.city && (
                    <p
                      className="text-[10px] truncate flex items-center gap-0.5"
                      style={{ color: "oklch(0.72 0.22 350)" }}
                    >
                      <MapPin
                        size={9}
                        style={{
                          color: "oklch(0.72 0.22 350)",
                          flexShrink: 0,
                        }}
                      />
                      {user.city}
                    </p>
                  )}
                  <p
                    className="text-[10px] font-medium"
                    style={{ color: status.color }}
                  >
                    {status.label}
                  </p>
                </div>

                {/* Hover glow */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: status.color,
                    boxShadow: `0 0 6px ${status.glow}`,
                  }}
                />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
