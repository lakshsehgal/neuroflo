"use client";

import { cn } from "@/lib/utils";
import { Hash, Lock, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { deleteChannel } from "@/actions/chat";
import type { ChannelSummary } from "./chat-layout";

interface ChannelSidebarProps {
  channels: ChannelSummary[];
  activeChannelId: string;
  isAdmin: boolean;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onDeleteChannel: (id: string) => void;
}

export function ChannelSidebar({
  channels,
  activeChannelId,
  isAdmin,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannel,
}: ChannelSidebarProps) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const publicChannels = filtered.filter((c) => c.type === "PUBLIC");
  const privateChannels = filtered.filter((c) => c.type === "PRIVATE");

  async function handleDelete(e: React.MouseEvent, channelId: string) {
    e.stopPropagation();
    if (!confirm("Delete this channel? All messages will be permanently removed.")) return;

    setDeletingId(channelId);
    const result = await deleteChannel(channelId);
    setDeletingId(null);

    if (result.success) {
      onDeleteChannel(channelId);
    } else {
      alert(result.error || "Failed to delete channel");
    }
  }

  return (
    <div className="flex w-64 flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Channels</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCreateChannel}
          title="Create channel"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            className="h-8 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {publicChannels.length > 0 && (
          <ChannelGroup
            label="Channels"
            channels={publicChannels}
            activeChannelId={activeChannelId}
            isAdmin={isAdmin}
            deletingId={deletingId}
            onSelect={onSelectChannel}
            onDelete={handleDelete}
          />
        )}
        {privateChannels.length > 0 && (
          <ChannelGroup
            label="Private"
            channels={privateChannels}
            activeChannelId={activeChannelId}
            isAdmin={isAdmin}
            deletingId={deletingId}
            onSelect={onSelectChannel}
            onDelete={handleDelete}
          />
        )}
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No channels found
          </p>
        )}
      </div>
    </div>
  );
}

function ChannelGroup({
  label,
  channels,
  activeChannelId,
  isAdmin,
  deletingId,
  onSelect,
  onDelete,
}: {
  label: string;
  channels: ChannelSummary[];
  activeChannelId: string;
  isAdmin: boolean;
  deletingId: string | null;
  onSelect: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <div className="mt-2">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {channels.map((channel) => {
        const isActive = channel.id === activeChannelId;
        const Icon = channel.type === "PRIVATE" ? Lock : Hash;
        const isDeleting = deletingId === channel.id;

        return (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.id)}
            className={cn(
              "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground",
              isDeleting && "opacity-50 pointer-events-none"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{channel.name}</span>
            {!channel.isMember && channel.type === "PUBLIC" && (
              <span className="ml-auto text-[10px] text-muted-foreground/60">
                join
              </span>
            )}
            {isAdmin && !channel.isGeneral && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => onDelete(e, channel.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onDelete(e as unknown as React.MouseEvent, channel.id);
                }}
                className="ml-auto hidden group-hover:inline-flex items-center justify-center h-5 w-5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Delete channel"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
