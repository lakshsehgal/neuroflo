"use client";

import { useState, useEffect, useCallback } from "react";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageArea } from "./message-area";
import { CreateChannelDialog } from "./create-channel-dialog";
import { ChannelMembersPanel } from "./channel-members-panel";
import { getUnreadCounts, markChannelRead } from "@/actions/chat";

export interface ChannelSummary {
  id: string;
  name: string;
  description: string | null;
  type: "PUBLIC" | "PRIVATE";
  isGeneral: boolean;
  memberCount: number;
  messageCount: number;
  isMember: boolean;
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface ChatLayoutProps {
  channels: ChannelSummary[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  generalChannelId: string;
  availableUsers: AvailableUser[];
}

export function ChatLayout({
  channels,
  currentUserId,
  currentUserName,
  currentUserRole,
  generalChannelId,
  availableUsers,
}: ChatLayoutProps) {
  const [activeChannelId, setActiveChannelId] = useState(generalChannelId);
  const [channelList, setChannelList] = useState(channels);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const activeChannel = channelList.find((c) => c.id === activeChannelId);

  // Poll for unread counts
  useEffect(() => {
    let cancelled = false;
    async function fetchUnread() {
      try {
        const counts = await getUnreadCounts();
        if (!cancelled) setUnreadCounts(counts);
      } catch {
        // ignore
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Mark initial channel as read
  useEffect(() => {
    markChannelRead(generalChannelId).catch(() => {});
  }, [generalChannelId]);

  // Mark channel as read when switching channels
  const handleSelectChannel = useCallback(async (channelId: string) => {
    setActiveChannelId(channelId);
    // Clear unread for this channel immediately (optimistic)
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
    await markChannelRead(channelId);
  }, []);

  function handleChannelCreated(channel: ChannelSummary) {
    setChannelList((prev) => [...prev, channel]);
    setActiveChannelId(channel.id);
    setShowCreateDialog(false);
  }

  function handleChannelJoined(channelId: string) {
    setChannelList((prev) =>
      prev.map((c) =>
        c.id === channelId
          ? { ...c, isMember: true, memberCount: c.memberCount + 1 }
          : c
      )
    );
  }

  function handleChannelLeft(channelId: string) {
    setChannelList((prev) =>
      prev.map((c) =>
        c.id === channelId
          ? { ...c, isMember: false, memberCount: c.memberCount - 1 }
          : c
      )
    );
    if (activeChannelId === channelId) {
      setActiveChannelId(generalChannelId);
    }
  }

  function handleChannelDeleted(channelId: string) {
    setChannelList((prev) => prev.filter((c) => c.id !== channelId));
    if (activeChannelId === channelId) {
      setActiveChannelId(generalChannelId);
    }
  }

  function handleChannelRenamed(channelId: string, newName: string) {
    setChannelList((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, name: newName } : c))
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-lg border bg-card overflow-hidden">
      {/* Channel sidebar */}
      <ChannelSidebar
        channels={channelList}
        activeChannelId={activeChannelId}
        isAdmin={currentUserRole === "ADMIN"}
        unreadCounts={unreadCounts}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={() => setShowCreateDialog(true)}
        onDeleteChannel={handleChannelDeleted}
      />

      {/* Message area */}
      <div className="flex flex-1 min-w-0">
        {activeChannel ? (
          <MessageArea
            channelId={activeChannel.id}
            channelName={activeChannel.name}
            channelType={activeChannel.type}
            isGeneral={activeChannel.isGeneral}
            isMember={activeChannel.isMember}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
            availableUsers={availableUsers}
            onJoin={() => handleChannelJoined(activeChannel.id)}
            onLeave={() => handleChannelLeft(activeChannel.id)}
            onToggleMembers={() => setShowMembers(!showMembers)}
            onChannelRenamed={handleChannelRenamed}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a channel to start chatting
          </div>
        )}
      </div>

      {/* Members panel */}
      {showMembers && activeChannel && (
        <ChannelMembersPanel
          channelId={activeChannel.id}
          channelName={activeChannel.name}
          channelType={activeChannel.type}
          isGeneral={activeChannel.isGeneral}
          availableUsers={availableUsers}
          currentUserId={currentUserId}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Create channel dialog */}
      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        availableUsers={availableUsers}
        currentUserId={currentUserId}
        onCreated={handleChannelCreated}
      />
    </div>
  );
}
