"use client";

import { useState, useEffect, useTransition } from "react";
import { getTicket, updateTicket, updateTicketStatus, addTicketComment, deleteTicket } from "@/actions/tickets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatRelativeTime, isOverdue, isDueSoon } from "@/lib/utils";
import {
  ExternalLink,
  Send,
  FileText,
  Link2,
  MessageSquare,
  Clock,
  AlertTriangle,
  User,
  Palette,
  CalendarDays,
  Pencil,
  Trash2,
  Maximize2,
  Package,
} from "lucide-react";
import Link from "next/link";

type UserOption = { id: string; name: string; avatar: string | null };
type ClientOption = { id: string; name: string };

interface TicketDetailModalProps {
  ticketId: string | null;
  users: UserOption[];
  clients: ClientOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated?: () => void;
}

type TicketDetail = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

const statusOptions = [
  { value: "NEW_REQUEST", label: "New Request", color: "bg-gray-100 text-gray-800" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "SIZE_CHANGES", label: "Size Changes", color: "bg-cyan-100 text-cyan-800" },
  { value: "READY_FOR_APPROVAL", label: "Ready for Approval", color: "bg-yellow-100 text-yellow-800" },
  { value: "SENT_TO_CLIENT", label: "Sent to Client", color: "bg-indigo-100 text-indigo-800" },
  { value: "NEEDS_EDIT", label: "Needs Edit", color: "bg-orange-100 text-orange-800" },
  { value: "APPROVED", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "AWAITING_EDITS", label: "Awaiting Edits", color: "bg-amber-100 text-amber-800" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-slate-100 text-slate-800" },
];

const priorityOptions = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-700" },
];

const formatLabels: Record<string, string> = {
  STATIC: "Static", VIDEO: "Video", UGC: "UGC", GIF: "GIF", CAROUSEL: "Carousel", DPA_FRAME: "DPA Frame",
};

export function TicketDetailModal({
  ticketId,
  users,
  clients,
  open,
  onOpenChange,
  onTicketUpdated,
}: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (ticketId && open) {
      setLoading(true);
      setShowDeleteConfirm(false);
      setEditingTitle(false);
      setEditingDesc(false);
      getTicket(ticketId).then((data) => {
        if (data) {
          setTicket(data);
          setTitle(data.title);
          setDescription(data.description || "");
        }
        setLoading(false);
      });
    }
  }, [ticketId, open]);

  function handleUpdateField(field: string, value: string) {
    if (!ticket) return;
    startTransition(async () => {
      try {
        await updateTicket(ticket.id, { [field]: value || null });
      } catch {
        // swallow revalidation errors
      }
      setTicket((prev) => prev ? { ...prev, [field]: value || null } : prev);
      onTicketUpdated?.();
    });
  }

  function handleStatusChange(status: string) {
    if (!ticket) return;
    startTransition(async () => {
      try {
        await updateTicketStatus(ticket.id, status as TicketDetail["status"]);
      } catch {
        // swallow
      }
      setTicket((prev) => prev ? { ...prev, status: status as TicketDetail["status"] } : prev);
      onTicketUpdated?.();
    });
  }

  function handleAssigneeChange(userId: string) {
    if (!ticket) return;
    const user = users.find((u) => u.id === userId);
    startTransition(async () => {
      await updateTicket(ticket.id, { assigneeId: userId || null });
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              assigneeId: userId || null,
              assignee: user ? { id: user.id, name: user.name, email: "", avatar: user.avatar } : null,
            }
          : prev
      );
      onTicketUpdated?.();
    });
  }

  function handleSaveTitle() {
    if (title.trim() && title !== ticket?.title) {
      handleUpdateField("title", title.trim());
      setTicket((prev) => prev ? { ...prev, title: title.trim() } : prev);
    }
    setEditingTitle(false);
  }

  function handleSaveDescription() {
    if (description !== (ticket?.description || "")) {
      handleUpdateField("description", description);
      setTicket((prev) => prev ? { ...prev, description: description || null } : prev);
    }
    setEditingDesc(false);
  }

  function handleComment() {
    if (!commentText.trim() || !ticket) return;
    startTransition(async () => {
      await addTicketComment(ticket.id, commentText.trim());
      setCommentText("");
      // Reload ticket data to get new comment
      const updated = await getTicket(ticket.id);
      if (updated) setTicket(updated);
    });
  }

  function handleDelete() {
    if (!ticket) return;
    startTransition(async () => {
      await deleteTicket(ticket.id);
      onOpenChange(false);
      onTicketUpdated?.();
    });
  }

  if (!open) return null;

  const currentStatus = ticket ? statusOptions.find((s) => s.value === ticket.status) : null;
  const overdue = ticket?.dueDate ? isOverdue(ticket.dueDate) : false;
  const dueSoon = ticket?.dueDate ? isDueSoon(ticket.dueDate) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {loading || !ticket ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {editingTitle ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") {
                          setTitle(ticket.title);
                          setEditingTitle(false);
                        }
                      }}
                      autoFocus
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <DialogTitle
                      className="cursor-pointer text-lg hover:text-primary"
                      onClick={() => setEditingTitle(true)}
                    >
                      {ticket.title}
                    </DialogTitle>
                  )}
                </div>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Open full screen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Link>
              </div>
              {/* Status & priority badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {currentStatus && (
                  <Badge className={`${currentStatus.color} text-xs`} variant="secondary">
                    {currentStatus.label}
                  </Badge>
                )}
                <Badge
                  className={`${priorityOptions.find((p) => p.value === ticket.priority)?.color || ""} text-xs`}
                  variant="secondary"
                >
                  {ticket.priority === "HIGH" || ticket.priority === "URGENT" ? (
                    <AlertTriangle className="mr-1 h-3 w-3" />
                  ) : null}
                  {ticket.priority}
                </Badge>
                {overdue && (
                  <Badge className="bg-red-500/10 text-red-600 text-xs animate-pulse">
                    <Clock className="mr-1 h-3 w-3" />
                    Overdue
                  </Badge>
                )}
                {!overdue && dueSoon && (
                  <Badge className="bg-amber-500/10 text-amber-600 text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    Due Soon
                  </Badge>
                )}
                {ticket.format && (
                  <Badge variant="outline" className="text-xs">
                    <Package className="mr-1 h-3 w-3" />
                    {formatLabels[ticket.format] || ticket.format}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Left column - main content */}
                <div className="space-y-5 md:col-span-2">
                  {/* Description */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Description
                    </h4>
                    {editingDesc ? (
                      <div className="space-y-2">
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setDescription(ticket.description || ""); setEditingDesc(false); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="cursor-pointer rounded-md border border-transparent p-2 text-sm text-muted-foreground hover:border-border hover:text-foreground"
                        onClick={() => setEditingDesc(true)}
                      >
                        {ticket.description || "Click to add description..."}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Delivery Link */}
                  {ticket.deliveryLink && (
                    <div className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <a
                        href={ticket.deliveryLink.startsWith("http") ? ticket.deliveryLink : `https://${ticket.deliveryLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        View Delivery <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* Creative Brief */}
                  {ticket.creativeBriefUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <a
                        href={ticket.creativeBriefUrl.startsWith("http") ? ticket.creativeBriefUrl : `https://${ticket.creativeBriefUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Open Creative Brief <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {(ticket.deliveryLink || ticket.creativeBriefUrl) && <Separator />}

                  {/* Comments */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      Comments ({ticket.comments.length})
                    </h4>
                    <div className="space-y-3">
                      {ticket.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px]">
                              {comment.author.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{comment.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(comment.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleComment();
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleComment}
                      disabled={!commentText.trim() || isPending}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Comment
                    </Button>
                  </div>
                </div>

                {/* Right column - metadata */}
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      Status
                    </label>
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      Priority
                    </label>
                    <Select value={ticket.priority} onValueChange={(v) => handleUpdateField("priority", v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <Badge className={`${p.color} text-xs`} variant="secondary">{p.label}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      Client
                    </label>
                    <Select
                      value={ticket.clientName || "none"}
                      onValueChange={(v) => {
                        const val = v === "none" ? "" : v;
                        handleUpdateField("clientName", val);
                        setTicket((prev) => prev ? { ...prev, clientName: val || null } : prev);
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <User className="h-3 w-3" />
                      Assignee
                    </label>
                    <Select
                      value={ticket.assignee?.id || "unassigned"}
                      onValueChange={(v) => handleAssigneeChange(v === "unassigned" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : "";
                        handleUpdateField("dueDate", val);
                        if (val) setTicket((prev) => prev ? { ...prev, dueDate: new Date(val) } : prev);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Palette className="h-3 w-3" />
                      Format
                    </label>
                    <Select
                      value={ticket.format || "none"}
                      onValueChange={(v) => {
                        const val = v === "none" ? "" : v;
                        handleUpdateField("format", val);
                        setTicket((prev) => prev ? { ...prev, format: (val || null) as TicketDetail["format"] } : prev);
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {Object.entries(formatLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Creator info */}
                  {ticket.creator && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px]">
                          {ticket.creator.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span>Created by {ticket.creator.name}</span>
                    </div>
                  )}

                  {/* Delete */}
                  <Separator className="my-3" />
                  {!showDeleteConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete Ticket
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 font-medium">Delete this ticket? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowDeleteConfirm(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1 h-7 text-xs" onClick={handleDelete} disabled={isPending}>
                          {isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
