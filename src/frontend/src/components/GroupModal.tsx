import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";
import { genId, getAvatarColor, getInitials, useReckon } from "../App";
import type { Conversation } from "../types";

interface GroupModalProps {
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

export default function GroupModal({ onClose, onCreated }: GroupModalProps) {
  const { currentUser, allUsers } = useReckon();
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id);

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error("Enter a group name");
      return;
    }
    if (selected.size < 1) {
      toast.error("Select at least one member");
      return;
    }
    const conv: Conversation = {
      id: genId(),
      isGroup: true,
      name: groupName.trim(),
      members: [currentUser.id, ...Array.from(selected)],
      createdAt: Date.now(),
    };
    toast.success(`Group "${conv.name}" created! 🎉`);
    onCreated(conv);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="glass-panel border-border/50 max-w-sm"
        data-ocid="group.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Create Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="group-name-input"
              className="text-sm text-muted-foreground"
            >
              Group Name
            </Label>
            <Input
              id="group-name-input"
              data-ocid="group.name_input"
              placeholder="e.g. Dev Team, Friends..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-secondary/50 border-border/60"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              Add Members ({selected.size} selected)
            </Label>
            <ScrollArea className="h-48 rounded-xl border border-border/40 bg-secondary/20">
              <div className="p-2 space-y-1">
                {otherUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No other users available
                  </p>
                ) : (
                  otherUsers.map((user) => {
                    const checkboxId = `group-member-${user.id}`;
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={selected.has(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                          className="border-border/60"
                        />
                        <label
                          htmlFor={checkboxId}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: getAvatarColor(user.id) }}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            {user.city && (
                              <p className="text-xs text-muted-foreground">
                                {user.city}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            data-ocid="group.cancel_button"
          >
            Cancel
          </Button>
          <Button
            data-ocid="group.submit_button"
            className="flex-1"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.48 0.24 300), oklch(0.45 0.2 260))",
            }}
            onClick={handleCreate}
          >
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
