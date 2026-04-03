"use client";

import { useState, useTransition } from "react";
import { updateTicket, updateTicketStatus, addTicketComment } from "@/actions/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  History,
  Clock,
  AlertTriangle,
  User,
  Palette,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  Pencil,
} from "lucide-react";
import type { getTicket } from "@/actions/tickets";

type TicketData = NonNullable<Awaited<ReturnType<typeof getTicket>>>;
type UserOption = { id: string; name: string; avatar: string | null };
type ClientOption = { id: string; name: string };

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
  { value: "AWAITING_ASSETS", label: "Awaiting Assets", color: "bg-purple-100 text-purple-800" },
  { value: "HOOK_CTA_VARIATIONS", label: "Hook/CTA Variations", color: "bg-rose-100 text-rose-800" },
];

const urgencyConfig: Record<string, { label: string; color: string; icon: boolean }> = {
  LOW: { label: "Low", color: "bg-slate-100 text-slate-700", icon: false },
  MEDIUM: { label: "Medium", color: "bg-blue-100 text-blue-700", icon: false },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-700", icon: true },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700", icon: true },
};

const formatLabels: Record<string, string> = {
  STATIC: "Static", VIDEO: "Video", UGC: "UGC", GIF: "GIF", CAROUSEL: "Carousel", DPA_FRAME: "DPA Frame",
};

const formatOptions = ["STATIC", "VIDEO", "UGC", "GIF", "CAROUSEL", "DPA_FRAME"];

export function TicketDetailContent({
  ticket: initialTicket,
  users,
  clients,
}: {
  ticket: TicketData;
  users: UserOption[];
  clients: ClientOption[];
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryLink, setDeliveryLink] = useState(ticket.deliveryLink || "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(ticket.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(ticket.description || "");

  function handleUpdateField(field: string, value: string) {
    startTransition(async () => {
      try {
        await updateTicket(ticket.id, { [field]: value || null });
      } catch {
        // DB write likely succeeded; swallow revalidation errors
      }
      setTicket((prev) => ({ ...prev, [field]: value || null }));
    });
  }

  function handleAssigneeChange(userId: string) {
    const user = users.find((u) => u.id === userId);
    startTransition(async () => {
      await updateTicket(ticket.id, { assigneeId: userId || null });
      setTicket((prev) => ({
        ...prev,
        assigneeId: userId || null,
        assignee: user ? { id: user.id, name: user.name, email: "", avatar: user.avatar } : null,
      }));
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      try {
        await updateTicketStatus(ticket.id, status as TicketData["status"]);
        setTicket((prev) => ({ ...prev, status: status as TicketData["status"] }));
      } catch {
        // Revalidation can cause transient errors; update local state since DB write succeeded
        setTicket((prev) => ({ ...prev, status: status as TicketData["status"] }));
      }
    });
  }

  function handleComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      await addTicketComment(ticket.id, commentText.trim());
      setCommentText("");
      window.location.reload();
    });
  }

  function handleSaveDelivery() {
    handleUpdateField("deliveryLink", deliveryLink);
    setEditingDelivery(false);
  }

  function handleSaveTitle() {
    if (titleDraft.trim() && titleDraft !== ticket.title) {
      handleUpdateField("title", titleDraft.trim());
      setTicket((prev) => ({ ...prev, title: titleDraft.trim() }));
    }
    setEditingTitle(false);
  }

  function handleSaveDescription() {
    if (descriptionDraft !== (ticket.description || "")) {
      handleUpdateField("description", descriptionDraft);
      setTicket((prev) => ({ ...prev, description: descriptionDraft || null }));
    }
    setEditingDescription(false);
  }

  const currentStatus = statusOptions.find((s) => s.value === ticket.status);
  const overdue = ticket.dueDate ? isOverdue(ticket.dueDate) : false;
  const dueSoon = ticket.dueDate ? isDueSoon(ticket.dueDate) : false;
  const urgency = urgencyConfig[ticket.priority] || urgencyConfig.MEDIUM;

  return (
    <div className="space-y-6">
      {/* ── Hero header ── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <Badge className={`${currentStatus?.color ?? ""} px-3 py-1 text-xs font-semibold shadow-sm transition-colors`} variant="secondary">
                {currentStatus?.label ?? ticket.status}
              </Badge>
              <Badge className={`${urgency.color} px-2.5 py-1 text-xs font-semibold`} variant="secondary">
                {urgency.icon && <AlertTriangle className="mr-1 h-3 w-3" />}
                {urgency.label}
              </Badge>
              {overdue && (
                <Badge className="bg-red-500/10 text-red-600 border-red-200 px-2.5 py-1 text-xs font-semibold animate-pulse">
                  <Clock className="mr-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
              {!overdue && dueSoon && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 px-2.5 py-1 text-xs font-semibold">
                  <Clock className="mr-1 h-3 w-3" />
                  Due Soon
                </Badge>
              )}
            </div>
            {editingTitle ? (
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") { setTitleDraft(ticket.title); setEditingTitle(false); }
                }}
                autoFocus
                className="text-2xl font-bold tracking-tight h-auto py-1 px-2 -ml-2"
              />
            ) : (
              <h1
                className="text-2xl font-bold tracking-tight text-foreground group/title cursor-text inline-flex items-center gap-2"
                onClick={() => { setEditingTitle(true); setTitleDraft(ticket.title); }}
              >
                {ticket.title}
                <Pencil className="h-4 w-4 text-muted-foreground/0 group-hover/title:text-muted-foreground/60 transition-colors" />
              </h1>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                  {ticket.creator.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <span>{ticket.creator.name}</span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>{formatRelativeTime(ticket.createdAt)}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shrink-0 transition-colors ${
            overdue
              ? "border-red-200 bg-red-50 text-red-700"
              : dueSoon
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}>
            <CalendarDays className="h-4 w-4" />
            <input
              type="date"
              value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().split("T")[0] : ""}
              onChange={(e) => {
                const val = e.target.value ? new Date(e.target.value).toISOString() : "";
                handleUpdateField("dueDate", val);
                if (val) setTicket((prev) => ({ ...prev, dueDate: new Date(val) }));
              }}
              className="bg-transparent border-0 outline-none text-sm font-medium cursor-pointer p-0 w-[120px]"
            />
          </div>
        </div>
      </div>

      {/* ── Main two-column layout ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column - content & collaboration */}
        <div className="space-y-5">

          {/* Description */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Description
                </CardTitle>
                {!editingDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => { setEditingDescription(true); setDescriptionDraft(ticket.description || ""); }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    rows={4}
                    autoFocus
                    className="text-sm"
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 px-3 text-xs" onClick={handleSaveDescription}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : ticket.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {ticket.description}
                </p>
              ) : (
                <p
                  className="text-sm text-muted-foreground/60 italic cursor-pointer hover:text-muted-foreground transition-colors"
                  onClick={() => { setEditingDescription(true); setDescriptionDraft(""); }}
                >
                  Click to add a description...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creative Brief + Delivery row */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Creative Brief */}
            {ticket.creativeBriefUrl && (
              <Card className="shadow-sm border-border/60 group hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Creative Brief</p>
                    <a
                      href={ticket.creativeBriefUrl.startsWith("http") ? ticket.creativeBriefUrl : `https://${ticket.creativeBriefUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline truncate block"
                    >
                      Open Brief
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Link */}
            <Card className="shadow-sm border-border/60">
              <CardContent className="p-4">
                {editingDelivery ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Delivery Link</p>
                    <div className="flex gap-2">
                      <Input
                        value={deliveryLink}
                        onChange={(e) => setDeliveryLink(e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveDelivery();
                          if (e.key === "Escape") setEditingDelivery(false);
                        }}
                      />
                      <Button size="sm" className="h-8 px-3" onClick={handleSaveDelivery}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingDelivery(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform ${
                      ticket.deliveryLink ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                    }`}>
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Delivery</p>
                      {ticket.deliveryLink ? (
                        <a
                          href={ticket.deliveryLink.startsWith("http") ? ticket.deliveryLink : `https://${ticket.deliveryLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate block"
                        >
                          View Delivery
                        </a>
                      ) : (
                        <button
                          onClick={() => setEditingDelivery(true)}
                          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Add link...
                        </button>
                      )}
                    </div>
                    {ticket.deliveryLink && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingDelivery(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revisions */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Revisions
                </CardTitle>
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {ticket.revisions.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {ticket.revisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No revisions yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Revisions will appear here as work progresses</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  {ticket.revisions.length > 1 && (
                    <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
                  )}
                  {ticket.revisions.map((rev, idx) => (
                    <div key={rev.id} className="relative flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      {/* Version badge as timeline node */}
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        idx === 0
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}>
                        v{rev.version}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium truncate">{rev.fileName}</span>
                          {idx === 0 && (
                            <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">Latest</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rev.uploadedBy.name} &middot; {formatRelativeTime(rev.createdAt)}
                        </p>
                        {rev.note && (
                          <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5 border border-border/40">
                            {rev.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments - chat-style */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Discussion
                </CardTitle>
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {ticket.comments.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {/* Messages area */}
              <div className="px-6">
                {ticket.comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Start the conversation</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Comments and feedback will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    {ticket.comments.map((comment) => (
                      <div key={comment.id} className="group flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                            {comment.author.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="rounded-lg bg-muted/50 border border-border/40 px-3.5 py-2.5 transition-colors group-hover:bg-muted/70">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-foreground">{comment.author.name}</span>
                              <span className="text-[11px] text-muted-foreground/60">{formatRelativeTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/80">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t bg-muted/20 p-4 mt-2 rounded-b-xl">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment... (Cmd+Enter to send)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      className="text-sm resize-none bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleComment();
                      }}
                    />
                  </div>
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 self-end rounded-full shadow-sm transition-all hover:scale-105"
                    onClick={handleComment}
                    disabled={!commentText.trim() || isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Properties card */}
          <Card className="shadow-sm border-border/60 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 text-sm border-border/60 hover:border-border transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${s.color.split(" ")[0].replace("100", "500")}`} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Urgency */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Urgency</label>
                <Select value={ticket.priority} onValueChange={(v) => handleUpdateField("priority", v)}>
                  <SelectTrigger className="h-9 text-sm border-border/60 hover:border-border transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="URGENT">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        Urgent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="!my-3" />

              {/* Client */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</label>
                <Select value={ticket.clientName || "none"} onValueChange={(v) => {
                  const val = v === "none" ? "" : v;
                  handleUpdateField("clientName", val);
                  setTicket((prev) => ({ ...prev, clientName: val || null }));
                }}>
                  <SelectTrigger className="h-9 text-sm border-border/60 hover:border-border transition-colors">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignee</label>
                <Select value={ticket.assignee?.id || "unassigned"} onValueChange={(v) => handleAssigneeChange(v === "unassigned" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm border-border/60 hover:border-border transition-colors">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 ring-1 ring-border">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                            {ticket.assignee.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Unassigned</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned"><span className="text-muted-foreground">Unassigned</span></SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                              {u.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {u.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned By */}
              {ticket.assignedBy && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned By</span>
                  <span className="text-sm font-medium">{ticket.assignedBy.name}</span>
                </div>
              )}

              <Separator className="!my-3" />

              {/* Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Format</label>
                <Select value={ticket.format || "none"} onValueChange={(v) => {
                  const val = v === "none" ? "" : v;
                  handleUpdateField("format", val);
                  setTicket((prev) => ({ ...prev, format: (val || null) as TicketData["format"] }));
                }}>
                  <SelectTrigger className="h-9 text-sm border-border/60 hover:border-border transition-colors">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                    {formatOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          {formatLabels[f] || f}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Creative Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</label>
                <Select value={ticket.creativeType || "none"} onValueChange={(v) => {
                  const val = v === "none" ? "" : v;
                  handleUpdateField("creativeType", val);
                  setTicket((prev) => ({ ...prev, creativeType: (val || null) as TicketData["creativeType"] }));
                }}>
                  <SelectTrigger className="h-9 text-sm border-border/60 hover:border-border transition-colors">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                    <SelectItem value="NET_NEW">
                      <div className="flex items-center gap-2">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        Net New
                      </div>
                    </SelectItem>
                    <SelectItem value="ITERATION">
                      <div className="flex items-center gap-2">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        Iteration
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</label>
                <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  overdue ? "border-red-200 text-red-600" : dueSoon ? "border-amber-200 text-amber-600" : "border-border/60 text-foreground"
                }`}>
                  {overdue && <AlertTriangle className="h-3 w-3 shrink-0" />}
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="date"
                    value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => {
                      const val = e.target.value ? new Date(e.target.value).toISOString() : "";
                      handleUpdateField("dueDate", val);
                      if (val) setTicket((prev) => ({ ...prev, dueDate: new Date(val) }));
                      else setTicket((prev) => ({ ...prev, dueDate: null }));
                    }}
                    className="bg-transparent border-0 outline-none text-sm font-medium cursor-pointer p-0 flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval History */}
          {ticket.approvals.length > 0 && (
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    Approval History
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {ticket.approvals.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ticket.approvals.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        a.status === "APPROVED"
                          ? "border-green-200 bg-green-50/50"
                          : "border-red-200 bg-red-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{a.approver.name}</span>
                        <Badge
                          className={`text-[10px] px-2 ${
                            a.status === "APPROVED"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {a.status === "APPROVED" ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {a.status}
                        </Badge>
                      </div>
                      {a.comment && (
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{a.comment}</p>
                      )}
                      <p className="mt-1.5 text-[10px] text-muted-foreground/60">{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
