"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Hash, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createChannel } from "@/actions/chat";
import type { ChannelSummary, AvailableUser } from "./chat-layout";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableUsers: AvailableUser[];
  currentUserId: string;
  onCreated: (channel: ChannelSummary) => void;
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  availableUsers,
  currentUserId,
  onCreated,
}: CreateChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const otherUsers = availableUsers.filter((u) => u.id !== currentUserId);
  const filteredUsers = otherUsers.filter(
    (u) =>
      !selectedUsers.includes(u.id) &&
      (u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  function reset() {
    setName("");
    setDescription("");
    setType("PUBLIC");
    setSelectedUsers([]);
    setUserSearch("");
    setError("");
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    setCreating(true);
    setError("");

    const result = await createChannel({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      memberIds: selectedUsers,
    });

    if (result.success && result.data) {
      onCreated({
        id: result.data.id,
        name: name.trim(),
        description: description.trim() || null,
        type,
        isGeneral: false,
        memberCount: selectedUsers.length + 1,
        messageCount: 0,
        isMember: true,
      });
      reset();
    } else {
      setError(result.error || "Failed to create channel");
    }

    setCreating(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) reset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where your team communicates. They&apos;re best organized
            around a topic or project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Channel type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("PUBLIC")}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
                type === "PUBLIC"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Hash className="h-4 w-4" />
              <div className="text-left">
                <p className="font-medium">Public</p>
                <p className="text-xs opacity-70">Anyone can join</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setType("PRIVATE")}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
                type === "PRIVATE"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Lock className="h-4 w-4" />
              <div className="text-left">
                <p className="font-medium">Private</p>
                <p className="text-xs opacity-70">Invite only</p>
              </div>
            </button>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              placeholder="e.g. design-team, project-alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="channel-desc">
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="channel-desc"
              placeholder="What&apos;s this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Members */}
          <div className="space-y-1.5">
            <Label>
              Add members{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUsers.map((uid) => {
                  const user = availableUsers.find((u) => u.id === uid);
                  if (!user) return null;
                  return (
                    <Badge
                      key={uid}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {user.name}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedUsers((prev) =>
                            prev.filter((id) => id !== uid)
                          )
                        }
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <Input
              placeholder="Search people..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 text-xs"
            />

            {userSearch && filteredUsers.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md border mt-1">
                {filteredUsers.slice(0, 8).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUsers((prev) => [...prev, user.id]);
                      setUserSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
