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
  getBookmarks,
  addBookmark,
  removeBookmark,
  renameChannel,
  toggleReaction,
  getUserProfile,
  markChannelRead,
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
  MessageSquare,
  Bookmark,
  Link2,
  Trash2,
  Pencil,
  SmilePlus,
  Mic,
  Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThreadPanel } from "./thread-panel";
import { EmojiPicker } from "./emoji-picker";
import type { AvailableUser } from "./chat-layout";

interface BookmarkData {
  id: string;
  title: string;
  url: string;
  addedBy: { id: string; name: string };
  createdAt: Date;
}

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

interface ReactionData {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string };
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
  _count?: { replies: number };
  replies?: { author: { id: string; name: string; avatar: string | null }; createdAt: Date }[];
  reactions?: ReactionData[];
  author: {
    id: string;
    name: string;
    avatar: string | null;
    position?: string | null;
  };
}

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  position: string | null;
  bio: string | null;
  role: string;
  department: { name: string } | null;
}

interface MessageAreaProps {
  channelId: string;
  channelName: string;
  channelType: "PUBLIC" | "PRIVATE";
  isGeneral: boolean;
  isMember: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  availableUsers: AvailableUser[];
  onJoin: () => void;
  onLeave: () => void;
  onToggleMembers: () => void;
  onChannelRenamed: (channelId: string, newName: string) => void;
}

export function MessageArea({
  channelId,
  channelName,
  channelType,
  isGeneral,
  isMember,
  currentUserId,
  currentUserName,
  currentUserRole,
  availableUsers,
  onJoin,
  onLeave,
  onToggleMembers,
  onChannelRenamed,
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
  // Thread state
  const [threadMessage, setThreadMessage] = useState<MessageData | null>(null);
  // Bookmark state
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkUrl, setBookmarkUrl] = useState("");
  const [addingBookmark, setAddingBookmark] = useState(false);
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  // Rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(channelName);
  const [renameSaving, setRenameSaving] = useState(false);
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
      // Mark channel as read
      markChannelRead(channelId).catch(() => {});
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

  async function handleReaction(messageId: string, emoji: string) {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const existing = reactions.find(
          (r) => r.emoji === emoji && r.userId === currentUserId
        );
        if (existing) {
          return { ...m, reactions: reactions.filter((r) => r.id !== existing.id) };
        }
        return {
          ...m,
          reactions: [
            ...reactions,
            { id: `temp-${Date.now()}`, emoji, userId: currentUserId, user: { id: currentUserId, name: currentUserName } },
          ],
        };
      })
    );
    await toggleReaction(messageId, emoji);
  }

  // ─── Bookmarks ──────────────────────────────────────────
  async function loadBookmarks() {
    const data = await getBookmarks(channelId);
    setBookmarks(data as BookmarkData[]);
  }

  async function handleAddBookmark() {
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) return;
    setAddingBookmark(true);
    const result = await addBookmark({
      channelId,
      title: bookmarkTitle.trim(),
      url: bookmarkUrl.trim(),
    });
    if (result.success) {
      await loadBookmarks();
      setBookmarkTitle("");
      setBookmarkUrl("");
      setShowAddBookmark(false);
    }
    setAddingBookmark(false);
  }

  async function handleRemoveBookmark(bookmarkId: string) {
    await removeBookmark(bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  }

  function handleToggleBookmarks() {
    if (!showBookmarks) {
      loadBookmarks();
    }
    setShowBookmarks(!showBookmarks);
  }

  // ─── Rename ────────────────────────────────────────────
  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === channelName) {
      setIsRenaming(false);
      setRenameValue(channelName);
      return;
    }
    setRenameSaving(true);
    const result = await renameChannel(channelId, trimmed);
    if (result.success) {
      onChannelRenamed(channelId, trimmed);
      setIsRenaming(false);
    } else {
      alert(result.error || "Failed to rename");
    }
    setRenameSaving(false);
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

  const canRename = !isGeneral && (currentUserRole === "ADMIN" || isMember);

  return (
    <div className="flex flex-1 min-w-0">
    <div className="flex flex-1 flex-col min-w-0">
      {/* Channel header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex items-center justify-between border-b px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-4 w-4 text-muted-foreground" />
          {isRenaming ? (
            <div className="flex items-center gap-1.5">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setIsRenaming(false);
                    setRenameValue(channelName);
                  }
                }}
                className="h-7 w-40 rounded border bg-background px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring/50"
                autoFocus
                disabled={renameSaving}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRename}
                disabled={renameSaving}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => { setIsRenaming(false); setRenameValue(channelName); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <h3 className="font-semibold">{channelName}</h3>
              {canRename && (
                <button
                  onClick={() => { setRenameValue(channelName); setIsRenaming(true); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-muted transition-all"
                  title="Rename channel"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-1.5 text-xs", showBookmarks && "text-primary")}
            onClick={handleToggleBookmarks}
            title="Bookmarks"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Bookmarks
          </Button>
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
      </motion.div>

      {/* Bookmarks bar */}
      <AnimatePresence>
        {showBookmarks && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b"
          >
            <div className="px-4 py-2 flex flex-wrap items-center gap-2">
              {bookmarks.length === 0 && !showAddBookmark && (
                <p className="text-xs text-muted-foreground">No bookmarks yet.</p>
              )}
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="group flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1 text-xs hover:bg-muted/60 transition-colors"
                >
                  <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline truncate max-w-[150px]"
                    title={bm.url}
                  >
                    {bm.title}
                  </a>
                  <button
                    onClick={() => handleRemoveBookmark(bm.id)}
                    className="opacity-0 group-hover:opacity-100 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Remove bookmark"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {showAddBookmark ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={bookmarkTitle}
                    onChange={(e) => setBookmarkTitle(e.target.value)}
                    placeholder="Title"
                    className="h-7 w-24 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
                    autoFocus
                  />
                  <input
                    value={bookmarkUrl}
                    onChange={(e) => setBookmarkUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-7 w-48 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddBookmark(); }}
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={handleAddBookmark}
                    disabled={addingBookmark || !bookmarkTitle.trim() || !bookmarkUrl.trim()}
                  >
                    {addingBookmark ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                  </Button>
                  <button
                    onClick={() => { setShowAddBookmark(false); setBookmarkTitle(""); setBookmarkUrl(""); }}
                    className="rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddBookmark(true)}
                  className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scroll-smooth"
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-full items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-6 w-6 text-muted-foreground" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-muted-foreground"
                >
                  Loading messages...
                </motion.p>
              </div>
            </motion.div>
          ) : messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex h-full flex-col items-center justify-center text-muted-foreground"
            >
              <motion.div
                initial={{ y: 8 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <ChannelIcon className="mb-2 h-10 w-10 opacity-30" />
              </motion.div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs">Be the first to send a message!</p>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const msgDate = new Date(msg.createdAt);
                const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                const showDateSeparator = !prevDate ||
                  msgDate.toDateString() !== prevDate.toDateString();
                const isConsecutive =
                  !showDateSeparator &&
                  prevMsg &&
                  prevMsg.author.id === msg.author.id &&
                  msgDate.getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000;
                const isOwn = msg.author.id === currentUserId;

                return (
                  <div key={msg.id}>
                    {showDateSeparator && (
                      <DateSeparator date={msgDate} />
                    )}
                    <MessageBubble
                      message={msg}
                      isConsecutive={!!isConsecutive}
                      isOwn={isOwn}
                      currentUserId={currentUserId}
                      onVote={handleVote}
                      onOpenThread={() => setThreadMessage(msg)}
                      onReaction={handleReaction}
                    />
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      {isMember || channelType === "PUBLIC" ? (
        <div className="border-t px-4 py-3">
          {/* Poll creation form */}
          <AnimatePresence>
            {showPollForm && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BarChart3 className="h-4 w-4 text-indigo-500" />
                      Create Poll
                    </div>
                    <button onClick={() => setShowPollForm(false)} className="rounded-full p-0.5 hover:bg-muted transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full rounded-md border bg-background px-3 py-1.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {pollOptions.map((opt, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            value={opt}
                            onChange={(e) => {
                              const updated = [...pollOptions];
                              updated[i] = e.target.value;
                              setPollOptions(updated);
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/50"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                              className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center justify-between">
                    {pollOptions.length < 6 && (
                      <button
                        onClick={() => setPollOptions([...pollOptions, ""])}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pending file preview */}
          <AnimatePresence>
            {pendingFile && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  <FileIcon type={pendingFile.type} />
                  <span className="truncate flex-1">{pendingFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(pendingFile.size)}
                  </span>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            {/* Mention dropdown */}
            <AnimatePresence>
              {showMentions && mentionUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute bottom-full left-0 mb-1 w-64 rounded-md border bg-popover shadow-lg z-10 overflow-hidden"
                >
                  {mentionUsers.slice(0, 6).map((user, idx) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-150",
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
                </motion.div>
              )}
            </AnimatePresence>

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
              <VoiceNoteButton
                channelId={channelId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onSent={async () => {
                  const data = await getMessages(channelId);
                  setMessages(data.messages as MessageData[]);
                  setTimeout(scrollToBottom, 100);
                }}
              />
              <textarea
                ref={inputRef}
                placeholder={`Message #${channelName} — type @ to mention`}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-shadow duration-200 max-h-32 min-h-9"
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
              <motion.div whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Button
                  type="button"
                  size="icon"
                  disabled={(!input.trim() && !pendingFile) || sending}
                  className="shrink-0 h-9 w-9 transition-opacity"
                  onClick={handleSend}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          You must be a member to send messages in this channel.
        </div>
      )}
    </div>

    {/* Thread panel */}
    <AnimatePresence>
      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          channelId={channelId}
          channelName={channelName}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </AnimatePresence>
    </div>
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
      <motion.a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-1.5"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
      >
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-xs max-h-64 rounded-md border object-cover hover:opacity-90 transition-opacity duration-200"
        />
      </motion.a>
    );
  }

  return (
    <motion.a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm hover:bg-muted/80 transition-colors duration-200 max-w-xs"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ x: 2 }}
    >
      <FileIcon type={fileType || ""} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{fileName}</p>
        {fileSize && (
          <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
        )}
      </div>
    </motion.a>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-2 max-w-sm rounded-lg border bg-muted/20 p-3 space-y-2"
    >
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
            <motion.button
              key={opt.id}
              onClick={() => onVote(opt.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "relative w-full rounded-md border px-3 py-2 text-left text-sm transition-colors overflow-hidden",
                isVoted
                  ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                  : "hover:border-muted-foreground/30 hover:bg-muted/50"
              )}
            >
              {/* Progress bar background */}
              <motion.div
                className={cn(
                  "absolute inset-y-0 left-0",
                  isVoted ? "bg-indigo-200/50 dark:bg-indigo-800/30" : "bg-muted/60"
                )}
                initial={{ width: 0 }}
                animate={{ width: totalVotes > 0 ? `${pct}%` : "0%" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {isVoted && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check className="h-3.5 w-3.5 text-indigo-600" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <span className={isVoted ? "font-medium" : ""}>{opt.text}</span>
                </div>
                {totalVotes > 0 && (
                  <motion.span
                    key={votes}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground ml-2"
                  >
                    {votes} ({pct.toFixed(0)}%)
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
    </motion.div>
  );
}

// ─── Date separator ──────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (date.toDateString() === today.toDateString()) {
    label = "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    label = "Yesterday";
  } else {
    label = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }

  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Time ago helper ─────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

// ─── Emoji picker (imported from ./emoji-picker.tsx) ─────

// ─── User profile popover ────────────────────────────────

function UserProfilePopover({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleOpen() {
    setOpen(!open);
    if (!open && !profile) {
      setLoading(true);
      const data = await getUserProfile(userId);
      setProfile(data as UserProfileData | null);
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={handleOpen} className="text-left">
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1 z-30 w-64 rounded-lg border bg-popover p-4 shadow-lg"
          >
            {loading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : profile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {profile.avatar && <AvatarImage src={profile.avatar} />}
                    <AvatarFallback className="text-sm">
                      {profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{profile.name}</p>
                    {profile.position && (
                      <p className="text-xs text-muted-foreground truncate">{profile.position}</p>
                    )}
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{profile.bio}</p>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  {profile.department && (
                    <p>Department: <span className="text-foreground">{profile.department.name}</span></p>
                  )}
                  <p>Role: <span className="text-foreground capitalize">{profile.role.toLowerCase()}</span></p>
                  <p className="truncate">{profile.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">User not found</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Voice note button ───────────────────────────────────

function VoiceNoteButton({
  channelId,
  currentUserId,
  currentUserName,
  onSent,
}: {
  channelId: string;
  currentUserId: string;
  currentUserName: string;
  onSent: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPreview({ blob, url });
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert("Microphone access denied");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setDuration(0);
  }

  function discardRecording() {
    if (preview) {
      URL.revokeObjectURL(preview.url);
      setPreview(null);
    }
  }

  async function handleSendVoice() {
    if (!preview) return;
    setSendingVoice(true);
    const file = new globalThis.File([preview.blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
    try {
      const { uploadFile } = await import("@/lib/upload");
      const uploaded = await uploadFile(file, `chat/${channelId}`);
      await sendMessage({
        channelId,
        content: "Voice note",
        fileName: uploaded.fileName,
        fileUrl: uploaded.url,
        fileType: uploaded.fileType,
        fileSize: uploaded.fileSize,
      });
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      onSent();
    } catch {
      alert("Failed to send voice note");
    }
    setSendingVoice(false);
  }

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (preview) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <audio src={preview.url} controls className="h-8 flex-1 max-w-xs" preload="auto" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={discardRecording}
          title="Discard"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSendVoice}
          disabled={sendingVoice}
          title="Send voice note"
        >
          {sendingVoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs text-red-500 font-medium">{formatDuration(duration)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-red-500 hover:text-red-600"
          onClick={stopRecording}
          title="Stop recording"
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0"
      onClick={startRecording}
      title="Record voice note"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}

// ─── Reactions display ───────────────────────────────────

function ReactionsDisplay({
  reactions,
  currentUserId,
  messageId,
  onReaction,
}: {
  reactions: ReactionData[];
  currentUserId: string;
  messageId: string;
  onReaction: (messageId: string, emoji: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, ReactionData[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  if (Object.keys(grouped).length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {Object.entries(grouped).map(([emoji, reactors]) => {
        const hasReacted = reactors.some((r) => r.userId === currentUserId);
        const names = reactors.map((r) => r.user.name).join(", ");
        return (
          <button
            key={emoji}
            onClick={() => onReaction(messageId, emoji)}
            title={names}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border h-7 px-2 text-sm transition-colors",
              hasReacted
                ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
                : "border-border bg-muted/40 hover:bg-muted"
            )}
          >
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-xs font-medium tabular-nums">{reactors.length}</span>
          </button>
        );
      })}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-dashed border-border hover:bg-muted transition-colors"
          title="Add reaction"
        >
          <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <AnimatePresence>
          {showPicker && (
            <EmojiPicker
              onSelect={(emoji) => onReaction(messageId, emoji)}
              onClose={() => setShowPicker(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────

function MessageBubble({
  message,
  isConsecutive,
  isOwn,
  currentUserId,
  onVote,
  onOpenThread,
  onReaction,
}: {
  message: MessageData;
  isConsecutive: boolean;
  isOwn: boolean;
  currentUserId: string;
  onVote: (optionId: string) => void;
  onOpenThread: () => void;
  onReaction: (messageId: string, emoji: string) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  const isOptimistic = message.id.startsWith("temp-");

  const replyCount = message._count?.replies ?? 0;
  const replyAvatars = message.replies ?? [];
  const uniqueAuthors = replyAvatars.reduce<{ id: string; name: string; avatar: string | null }[]>(
    (acc, r) => {
      if (!acc.find((a) => a.id === r.author.id)) acc.push(r.author);
      return acc;
    },
    []
  );
  const lastReplyTime = replyAvatars.length > 0 ? replyAvatars[0].createdAt : null;

  const reactions = message.reactions || [];
  const isAudioFile = message.fileType?.startsWith("audio/");

  const messageContent = (
    <>
      {message.content && !message.poll && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          <RenderContent text={message.content} />
        </p>
      )}
      {message.fileUrl && message.fileName && isAudioFile ? (
        <div className="mt-1.5 max-w-xs">
          <audio controls className="h-8 w-full" preload="metadata">
            <source src={message.fileUrl} type={message.fileType || "audio/webm"} />
          </audio>
        </div>
      ) : message.fileUrl && message.fileName ? (
        <FileAttachment
          fileName={message.fileName}
          fileUrl={message.fileUrl}
          fileType={message.fileType}
          fileSize={message.fileSize}
        />
      ) : null}
      {message.poll && (
        <PollWidget poll={message.poll} currentUserId={currentUserId} onVote={onVote} />
      )}
      {/* Reactions */}
      <ReactionsDisplay
        reactions={reactions}
        currentUserId={currentUserId}
        messageId={message.id}
        onReaction={onReaction}
      />
      {/* Thread indicator */}
      {replyCount > 0 && (
        <button
          onClick={onOpenThread}
          className="mt-1.5 flex items-center gap-2 text-xs group/thread hover:bg-muted/50 rounded px-1 py-0.5 -ml-1 transition-colors"
        >
          <div className="flex -space-x-1.5">
            {uniqueAuthors.slice(0, 3).map((author) => {
              const init = author.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <Avatar key={author.id} className="h-5 w-5 border-2 border-background">
                  {author.avatar && <AvatarImage src={author.avatar} />}
                  <AvatarFallback className="text-[7px]">{init}</AvatarFallback>
                </Avatar>
              );
            })}
          </div>
          <span className="font-semibold text-primary">
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
          {lastReplyTime && (
            <span className="text-muted-foreground">
              {timeAgo(lastReplyTime)}
            </span>
          )}
        </button>
      )}
      {/* Hover actions */}
      <div className={cn("items-center gap-0.5 absolute -top-3 right-2 rounded-md border bg-popover shadow-sm px-0.5 py-0.5 z-10", showEmojiPicker ? "flex" : "hidden group-hover:flex")}>
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <AnimatePresence>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={(emoji) => onReaction(message.id, emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>
        {replyCount === 0 && !message.poll && (
          <button
            onClick={onOpenThread}
            className="rounded p-1 hover:bg-muted transition-colors"
            title="Reply in thread"
          >
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </>
  );

  if (isConsecutive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="group relative flex items-start gap-3 pl-12 py-0.5 hover:bg-muted/50 rounded transition-colors duration-150"
      >
        <span className="invisible group-hover:visible text-[10px] text-muted-foreground min-w-[3rem] text-right pt-0.5 transition-all">
          {timeStr}
        </span>
        <div className="min-w-0 flex-1">{messageContent}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative flex items-start gap-3 py-2 hover:bg-muted/50 rounded px-1 transition-colors duration-150",
        !isConsecutive && "mt-2"
      )}
    >
      <UserProfilePopover userId={message.author.id}>
        <Avatar className="h-8 w-8 mt-0.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
          {message.author.avatar && (
            <AvatarImage src={message.author.avatar} alt={message.author.name} />
          )}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </UserProfilePopover>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <UserProfilePopover userId={message.author.id}>
            <span className={cn("text-sm font-semibold cursor-pointer hover:underline", isOwn && "text-primary")}>
              {message.author.name}
            </span>
          </UserProfilePopover>
          {message.author.position && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {message.author.position}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
        </div>
        {messageContent}
      </div>
    </motion.div>
  );
}
