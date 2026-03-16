"use client";

import { useState, useEffect } from "react";
import { getChannel, addMembersToChannel } from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Loader2 } from "lucide-react";
import type { AvailableUser } from "./chat-layout";

interface ChannelMembersPanelProps {
  channelId: string;
  channelName: string;
  channelType: "PUBLIC" | "PRIVATE";
  isGeneral: boolean;
  availableUsers: AvailableUser[];
  currentUserId: string;
  onClose: () => void;
}

interface ChannelMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
  };
}

export function ChannelMembersPanel({
  channelId,
  channelName,
  channelType,
  isGeneral,
  availableUsers,
  currentUserId,
  onClose,
}: ChannelMembersPanelProps) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getChannel(channelId).then((ch) => {
      if (ch) setMembers(ch.members as ChannelMember[]);
      setLoading(false);
    });
  }, [channelId]);

  const memberIds = new Set(members.map((m) => m.user.id));
  const nonMembers = availableUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      (u.name.toLowerCase().includes(addSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(addSearch.toLowerCase()))
  );

  async function handleAddUser(userId: string) {
    setAdding(true);
    const result = await addMembersToChannel(channelId, [userId]);
    if (result.success) {
      const user = availableUsers.find((u) => u.id === userId);
      if (user) {
        setMembers((prev) => [
          ...prev,
          {
            id: `new-${userId}`,
            role: "MEMBER",
            user: { ...user, email: user.email },
          },
        ]);
      }
    }
    setAdding(false);
    setAddSearch("");
  }

  return (
    <div className="flex w-72 flex-col border-l bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Members</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Add member button */}
      {!isGeneral && (
        <div className="border-b px-4 py-2">
          {showAddUser ? (
            <div className="space-y-2">
              <Input
                placeholder="Search people to add..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="h-8 text-xs"
                autoFocus
              />
              {addSearch && nonMembers.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {nonMembers.slice(0, 6).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleAddUser(user.id)}
                      disabled={adding}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-5 w-5">
                        {user.avatar && <AvatarImage src={user.avatar} />}
                        <AvatarFallback className="text-[8px]">
                          {user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {addSearch && nonMembers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No users to add
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => {
                  setShowAddUser(false);
                  setAddSearch("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 gap-1.5 text-xs"
              onClick={() => setShowAddUser(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add People
            </Button>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {members.map((member) => {
              const initials = member.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-7 w-7">
                    {member.user.avatar && (
                      <AvatarImage src={member.user.avatar} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {member.user.name}
                      {member.user.id === currentUserId && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          (you)
                        </span>
                      )}
                    </p>
                  </div>
                  {member.role === "OWNER" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      owner
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2">
        <p className="text-[10px] text-muted-foreground text-center">
          {members.length} member{members.length !== 1 ? "s" : ""} in #{channelName}
        </p>
      </div>
    </div>
  );
}
