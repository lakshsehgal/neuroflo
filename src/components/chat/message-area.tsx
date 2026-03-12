"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getMessages, sendMessage, getNewMessages, joinChannel, leaveChannel } from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Hash,
  Lock,
  Send,
  Users,
  LogOut,
  LogIn,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageData {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface MessageAreaProps {
  channelId: string;
  channelName: string;
  channelType: "PUBLIC" | "PRIVATE";
  isGeneral: boolean;
  isMember: boolean;
  currentUserId: string;
  currentUserName: string;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMembers: () => void;
}

export function MessageArea({
  channelId,
  channelName,
  channelType,
  isGeneral,
  isMember,
  currentUserId,
  currentUserName,
  onJoin,
  onLeave,
  onToggleMembers,
}: MessageAreaProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load messages on channel change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);

    getMessages(channelId).then((data) => {
      if (cancelled) return;
      setMessages(data.messages as MessageData[]);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    });

    return () => {
      cancelled = true;
    };
  }, [channelId, scrollToBottom]);

  // Poll for new messages every 3s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      if (messages.length === 0) return;
      const lastId = messages[messages.length - 1].id;
      try {
        const newMsgs = await getNewMessages(channelId, lastId);
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const unique = (newMsgs as MessageData[]).filter(
              (m) => !existingIds.has(m.id)
            );
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
          setTimeout(scrollToBottom, 100);
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [channelId, messages, scrollToBottom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    // Optimistic update
    const optimisticMsg: MessageData = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date(),
      author: {
        id: currentUserId,
        name: currentUserName,
        avatar: null,
      },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    const result = await sendMessage({ channelId, content });
    if (result.success && result.data) {
      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, id: result.data!.id } : m
        )
      );
    }
    setSending(false);
  }

  async function handleJoin() {
    const result = await joinChannel(channelId);
    if (result.success) onJoin();
  }

  async function handleLeave() {
    const result = await leaveChannel(channelId);
    if (result.success) onLeave();
  }

  const ChannelIcon = channelType === "PRIVATE" ? Lock : Hash;

  return (
    <>
      {/* Channel header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">{channelName}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onToggleMembers}
          >
            <Users className="h-3.5 w-3.5" />
            Members
          </Button>
          {isMember && !isGeneral && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleLeave}
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave
            </Button>
          )}
          {!isMember && channelType === "PUBLIC" && (
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleJoin}
            >
              <LogIn className="h-3.5 w-3.5" />
              Join Channel
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <ChannelIcon className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Be the first to send a message!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isConsecutive =
                prevMsg &&
                prevMsg.author.id === msg.author.id &&
                new Date(msg.createdAt).getTime() -
                  new Date(prevMsg.createdAt).getTime() <
                  5 * 60 * 1000;
              const isOwn = msg.author.id === currentUserId;

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isConsecutive={!!isConsecutive}
                  isOwn={isOwn}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {isMember || channelType === "PUBLIC" ? (
        <form onSubmit={handleSend} className="border-t px-4 py-3">
          <div className="flex gap-2">
            <Input
              placeholder={`Message #${channelName}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sending}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          You must be a member to send messages in this channel.
        </div>
      )}
    </>
  );
}

function MessageBubble({
  message,
  isConsecutive,
  isOwn,
}: {
  message: MessageData;
  isConsecutive: boolean;
  isOwn: boolean;
}) {
  const time = new Date(message.createdAt);
  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const initials = message.author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isConsecutive) {
    return (
      <div className="group flex items-start gap-3 pl-12 py-0.5 hover:bg-muted/50 rounded">
        <span className="invisible group-hover:visible text-[10px] text-muted-foreground min-w-[3rem] text-right pt-0.5">
          {timeStr}
        </span>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-start gap-3 py-2 hover:bg-muted/50 rounded px-1", !isConsecutive && "mt-2")}>
      <Avatar className="h-8 w-8 mt-0.5 shrink-0">
        {message.author.avatar && (
          <AvatarImage src={message.author.avatar} alt={message.author.name} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              isOwn && "text-primary"
            )}
          >
            {message.author.name}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
