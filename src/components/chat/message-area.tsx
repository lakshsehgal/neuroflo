"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getMessages,
  sendMessage,
  getNewMessages,
  joinChannel,
  leaveChannel,
  createPoll,
  votePoll,
} from "@/actions/chat";
import { uploadFile } from "@/lib/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Hash,
  Lock,
  Send,
  Users,
  LogOut,
  LogIn,
  Loader2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  X,
  BarChart3,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableUser } from "./chat-layout";

interface PollOptionData {
  id: string;
  text: string;
  votes: { userId: string }[];
}

interface PollData {
  id: string;
  question: string;
  options: PollOptionData[];
}

interface MessageData {
  id: string;
  content: string;
  createdAt: Date;
  fileName?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  poll?: PollData | null;
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
  availableUsers: AvailableUser[];
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
  availableUsers,
  onJoin,
  onLeave,
  onToggleMembers,
}: MessageAreaProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: globalThis.File;
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Mention filtering
  const mentionUsers = availableUsers.filter(
    (u) =>
      u.id !== currentUserId &&
      u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);

    // Check for @ mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(user: AvailableUser) {
    const textarea = inputRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const beforeAt = textBeforeCursor.slice(0, atMatch.index);
      const newText = `${beforeAt}@${user.name} ${textAfterCursor}`;
      setInput(newText);
      setShowMentions(false);

      setTimeout(() => {
        const newPos = (beforeAt + `@${user.name} `).length;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, mentionUsers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionUsers[mentionIndex]);
        return;
      } else if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert("File size must be under 25MB");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(file, `chat/${channelId}`);
      setPendingFile({
        file,
        url: uploaded.url,
        name: uploaded.fileName,
        type: uploaded.fileType,
        size: uploaded.fileSize,
      });
    } catch {
      alert("Failed to upload file");
    }
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    const content = input.trim();
    if ((!content && !pendingFile) || sending) return;

    setSending(true);
    setInput("");
    setShowMentions(false);

    // Optimistic update
    const optimisticMsg: MessageData = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date(),
      fileName: pendingFile?.name,
      fileUrl: pendingFile?.url,
      fileType: pendingFile?.type,
      fileSize: pendingFile?.size,
      author: {
        id: currentUserId,
        name: currentUserName,
        avatar: null,
      },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    const result = await sendMessage({
      channelId,
      content,
      fileName: pendingFile?.name,
      fileUrl: pendingFile?.url,
      fileType: pendingFile?.type,
      fileSize: pendingFile?.size,
    });

    if (result.success && result.data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id ? { ...m, id: result.data!.id } : m
        )
      );
    }
    setPendingFile(null);
    setSending(false);
  }

  async function handleCreatePoll() {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;

    setCreatingPoll(true);
    const result = await createPoll(channelId, pollQuestion, validOptions);
    if (result.success) {
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowPollForm(false);
      // Refresh messages to show the new poll
      const data = await getMessages(channelId);
      setMessages(data.messages as MessageData[]);
      setTimeout(scrollToBottom, 100);
    }
    setCreatingPoll(false);
  }

  async function handleVote(optionId: string) {
    await votePoll(optionId);
    // Refresh messages to show updated votes
    const data = await getMessages(channelId);
    setMessages(data.messages as MessageData[]);
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
                  currentUserId={currentUserId}
                  onVote={handleVote}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {isMember || channelType === "PUBLIC" ? (
        <div className="border-t px-4 py-3">
          {/* Poll creation form */}
          {showPollForm && (
            <div className="mb-3 rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Create Poll
                </div>
                <button onClick={() => setShowPollForm(false)} className="rounded-full p-0.5 hover:bg-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="space-y-1.5">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...pollOptions];
                        updated[i] = e.target.value;
                        setPollOptions(updated);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-destructive"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                {pollOptions.length < 6 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                )}
                <Button
                  size="sm"
                  className="ml-auto h-7 text-xs"
                  disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2 || creatingPoll}
                  onClick={handleCreatePoll}
                >
                  {creatingPoll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Send Poll
                </Button>
              </div>
            </div>
          )}

          {/* Pending file preview */}
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <FileIcon type={pendingFile.type} />
              <span className="truncate flex-1">{pendingFile.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(pendingFile.size)}
              </span>
              <button
                onClick={() => setPendingFile(null)}
                className="rounded-full p-0.5 hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative">
            {/* Mention dropdown */}
            {showMentions && mentionUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-64 rounded-md border bg-popover shadow-lg z-10">
                {mentionUsers.slice(0, 6).map((user, idx) => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                      idx === mentionIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      {user.avatar && <AvatarImage src={user.avatar} />}
                      <AvatarFallback className="text-[8px]">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {user.email}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9 shrink-0", showPollForm && "text-indigo-500")}
                onClick={() => setShowPollForm(!showPollForm)}
                title="Create poll"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <textarea
                ref={inputRef}
                placeholder={`Message #${channelName} — type @ to mention`}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-32 min-h-9"
                style={{
                  height: "auto",
                  minHeight: "36px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
              <Button
                type="button"
                size="icon"
                disabled={(!input.trim() && !pendingFile) || sending}
                className="shrink-0 h-9 w-9"
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          You must be a member to send messages in this channel.
        </div>
      )}
    </>
  );
}

// ─── Render message content with @mentions and links ────

function RenderContent({ text }: { text: string }) {
  if (!text) return null;

  // Split on @mentions and URLs
  // URL pattern
  const urlRegex = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;
  // @mention pattern
  const mentionRegex = /(@[\w\s]+?)(?=\s@|\s[^@]|$)/g;

  // Combined regex that matches either
  const combinedRegex = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])|(@\w[\w\s]*?\w(?=\s|$))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const combined = new RegExp(combinedRegex);
  while ((match = combined.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // URL match
      const url = match[1];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
        >
          {url}
        </a>
      );
    } else if (match[2]) {
      // @mention match
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="rounded bg-primary/10 px-1 py-0.5 text-primary font-medium"
        >
          {match[2]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}

// ─── File attachment display ────────────────────────────

function FileAttachment({
  fileName,
  fileUrl,
  fileType,
  fileSize,
}: {
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
}) {
  const isImage = fileType?.startsWith("image/");

  if (isImage) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-xs max-h-64 rounded-md border object-cover hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm hover:bg-muted/80 transition-colors max-w-xs"
    >
      <FileIcon type={fileType || ""} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fileName}</p>
        {fileSize && (
          <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
        )}
      </div>
    </a>
  );
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-green-500 shrink-0" />;
  if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
  return <File className="h-4 w-4 text-blue-500 shrink-0" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Message bubble ─────────────────────────────────────

function PollWidget({
  poll,
  currentUserId,
  onVote,
}: {
  poll: PollData;
  currentUserId: string;
  onVote: (optionId: string) => void;
}) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
  const userVotedOption = poll.options.find((o) =>
    o.votes.some((v) => v.userId === currentUserId)
  );

  return (
    <div className="mt-2 max-w-sm rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart3 className="h-4 w-4 text-indigo-500" />
        {poll.question}
      </div>
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const votes = opt.votes.length;
          const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const isVoted = userVotedOption?.id === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => onVote(opt.id)}
              className={cn(
                "relative w-full rounded-md border px-3 py-2 text-left text-sm transition-all overflow-hidden",
                isVoted
                  ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                  : "hover:border-muted-foreground/30 hover:bg-muted/50"
              )}
            >
              {/* Progress bar background */}
              {totalVotes > 0 && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-500",
                    isVoted ? "bg-indigo-200/50 dark:bg-indigo-800/30" : "bg-muted/60"
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isVoted && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  <span className={isVoted ? "font-medium" : ""}>{opt.text}</span>
                </div>
                {totalVotes > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {votes} ({pct.toFixed(0)}%)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </div>
  );
}

function MessageBubble({
  message,
  isConsecutive,
  isOwn,
  currentUserId,
  onVote,
}: {
  message: MessageData;
  isConsecutive: boolean;
  isOwn: boolean;
  currentUserId: string;
  onVote: (optionId: string) => void;
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

  const messageContent = (
    <>
      {message.content && !message.poll && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          <RenderContent text={message.content} />
        </p>
      )}
      {message.fileUrl && message.fileName && (
        <FileAttachment
          fileName={message.fileName}
          fileUrl={message.fileUrl}
          fileType={message.fileType}
          fileSize={message.fileSize}
        />
      )}
      {message.poll && (
        <PollWidget poll={message.poll} currentUserId={currentUserId} onVote={onVote} />
      )}
    </>
  );

  if (isConsecutive) {
    return (
      <div className="group flex items-start gap-3 pl-12 py-0.5 hover:bg-muted/50 rounded">
        <span className="invisible group-hover:visible text-[10px] text-muted-foreground min-w-[3rem] text-right pt-0.5">
          {timeStr}
        </span>
        <div className="min-w-0">{messageContent}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3 py-2 hover:bg-muted/50 rounded px-1",
        !isConsecutive && "mt-2"
      )}
    >
      <Avatar className="h-8 w-8 mt-0.5 shrink-0">
        {message.author.avatar && (
          <AvatarImage src={message.author.avatar} alt={message.author.name} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn("text-sm font-semibold", isOwn && "text-primary")}
          >
            {message.author.name}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
        </div>
        {messageContent}
      </div>
    </div>
  );
}
