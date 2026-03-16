"use client";

import { useState, useEffect, useRef } from "react";
import { getThreadMessages, sendMessage } from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Send, Loader2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThreadMessage {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface ParentMessage {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: Date;
}

interface ThreadPanelProps {
  parentMessage: ParentMessage;
  channelId: string;
  channelName: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
}

export function ThreadPanel({
  parentMessage,
  channelId,
  channelName,
  currentUserId,
  currentUserName,
  onClose,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLoading(true);
    getThreadMessages(parentMessage.id).then((msgs) => {
      setReplies(msgs as ThreadMessage[]);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [parentMessage.id]);

  // Poll for new replies every 3s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const msgs = await getThreadMessages(parentMessage.id);
        setReplies((prev) => {
          if (msgs.length !== prev.length) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            return msgs as ThreadMessage[];
          }
          return prev;
        });
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [parentMessage.id]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    // Optimistic update
    const optimistic: ThreadMessage = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date(),
      author: { id: currentUserId, name: currentUserName, avatar: null },
    };
    setReplies((prev) => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const result = await sendMessage({
      channelId,
      content,
      parentId: parentMessage.id,
    });

    if (result.success && result.data) {
      setReplies((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, id: result.data!.id } : m))
      );
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const parentTime = new Date(parentMessage.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const parentInitials = parentMessage.author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex w-80 flex-col border-l bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Thread</h3>
          <span className="text-xs text-muted-foreground">#{channelName}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="border-b px-4 py-3 bg-muted/20">
        <div className="flex items-start gap-2.5">
          <Avatar className="h-7 w-7 mt-0.5 shrink-0">
            {parentMessage.author.avatar && (
              <AvatarImage src={parentMessage.author.avatar} />
            )}
            <AvatarFallback className="text-[10px]">{parentInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold">{parentMessage.author.name}</span>
              <span className="text-[10px] text-muted-foreground">{parentTime}</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-0.5">
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-30 mb-2" />
            <p className="text-xs">No replies yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {replies.map((reply) => {
              const time = new Date(reply.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const initials = reply.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const isOptimistic = reply.id.startsWith("temp-");

              return (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2.5 py-1.5 hover:bg-muted/50 rounded px-1 transition-colors"
                >
                  <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                    {reply.author.avatar && <AvatarImage src={reply.author.avatar} />}
                    <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          reply.author.id === currentUserId && "text-primary"
                        )}
                      >
                        {reply.author.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {reply.content}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      <div className="border-t px-3 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            placeholder="Reply in thread..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-shadow max-h-24 min-h-9"
            style={{ height: "auto", minHeight: "36px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 96) + "px";
            }}
          />
          <motion.div whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              type="button"
              size="icon"
              disabled={!input.trim() || sending}
              className="shrink-0 h-9 w-9"
              onClick={handleSend}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
