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
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ExternalLink, Send } from "lucide-react";
import type { getTicket } from "@/actions/tickets";

type TicketData = NonNullable<Awaited<ReturnType<typeof getTicket>>>;

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

const formatLabels: Record<string, string> = {
  STATIC: "Static", VIDEO: "Video", UGC: "UGC", GIF: "GIF", CAROUSEL: "Carousel", DPA_FRAME: "DPA Frame",
};

export function TicketDetailContent({ ticket: initialTicket }: { ticket: TicketData }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [isPending, startTransition] = useTransition();
  const [commentText, setCommentText] = useState("");
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [deliveryLink, setDeliveryLink] = useState(ticket.deliveryLink || "");

  function handleUpdateField(field: string, value: string) {
    startTransition(async () => {
      await updateTicket(ticket.id, { [field]: value || null });
      setTicket((prev) => ({ ...prev, [field]: value || null }));
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateTicketStatus(ticket.id, status as TicketData["status"]);
      setTicket((prev) => ({ ...prev, status: status as TicketData["status"] }));
    });
  }

  function handleComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      await addTicketComment(ticket.id, commentText.trim());
      setCommentText("");
      // Optimistically add to UI - we don't refetch since server revalidates
      window.location.reload();
    });
  }

  function handleSaveDelivery() {
    handleUpdateField("deliveryLink", deliveryLink);
    setEditingDelivery(false);
  }

  const currentStatus = statusOptions.find((s) => s.value === ticket.status);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created by {ticket.creator.name} &middot; {formatRelativeTime(ticket.createdAt)}
          </p>
        </div>

        {ticket.description && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Creative Brief */}
        {ticket.creativeBriefUrl && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ExternalLink className="h-4 w-4 text-primary" />
              <a
                href={ticket.creativeBriefUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open Creative Brief
              </a>
            </CardContent>
          </Card>
        )}

        {/* Delivery Link */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Creative Delivery</CardTitle></CardHeader>
          <CardContent>
            {editingDelivery ? (
              <div className="flex gap-2">
                <Input
                  value={deliveryLink}
                  onChange={(e) => setDeliveryLink(e.target.value)}
                  placeholder="Paste delivery link..."
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveDelivery}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingDelivery(false)}>Cancel</Button>
              </div>
            ) : ticket.deliveryLink ? (
              <div className="flex items-center gap-3">
                <a
                  href={ticket.deliveryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {ticket.deliveryLink}
                </a>
                <Button size="sm" variant="ghost" onClick={() => setEditingDelivery(true)}>Edit</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditingDelivery(true)}>
                Add delivery link
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Revisions */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Revisions ({ticket.revisions.length})</CardTitle></CardHeader>
          <CardContent>
            {ticket.revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revisions uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {ticket.revisions.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">v{rev.version} - {rev.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        by {rev.uploadedBy.name} &middot; {formatRelativeTime(rev.createdAt)}
                      </p>
                      {rev.note && <p className="mt-1 text-xs text-muted-foreground">{rev.note}</p>}
                    </div>
                    <Badge variant="outline">v{rev.version}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Comments ({ticket.comments.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ticket.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-4">
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
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

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
            <Button size="sm" onClick={handleComment} disabled={!commentText.trim() || isPending}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Comment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Status</p>
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <Badge className={`${s.color} text-xs`} variant="secondary">{s.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Urgency</p>
              <Select value={ticket.priority} onValueChange={(v) => handleUpdateField("priority", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Client</p>
              <p className="mt-1 text-sm">{ticket.clientName || "—"}</p>
            </div>

            {/* Assignee */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assignee</p>
              {ticket.assignee ? (
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{ticket.assignee.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                  <span className="text-sm">{ticket.assignee.name}</span>
                </div>
              ) : <p className="mt-1 text-sm text-muted-foreground">Unassigned</p>}
            </div>

            {/* Assigned By */}
            {ticket.assignedBy && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assigned By</p>
                <p className="mt-1 text-sm">{ticket.assignedBy.name}</p>
              </div>
            )}

            {/* Format */}
            {ticket.format && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Format</p>
                <Badge variant="outline" className="mt-1">{formatLabels[ticket.format] || ticket.format}</Badge>
              </div>
            )}

            {/* Creative Type */}
            {ticket.creativeType && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Creative Type</p>
                <Badge variant="outline" className="mt-1">{ticket.creativeType === "NET_NEW" ? "Net New" : "Iteration"}</Badge>
              </div>
            )}

            {/* Due Date */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Due Date</p>
              {ticket.dueDate ? (
                <p className="mt-1 text-sm">{formatDate(ticket.dueDate)}</p>
              ) : <p className="mt-1 text-sm text-muted-foreground">Not set</p>}
            </div>
          </CardContent>
        </Card>

        {/* Approval History */}
        {ticket.approvals.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Approval History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ticket.approvals.map((a) => (
                  <div key={a.id} className="rounded-md border p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{a.approver.name}</span>
                      <Badge variant={a.status === "APPROVED" ? "default" : "destructive"} className="text-xs">
                        {a.status}
                      </Badge>
                    </div>
                    {a.comment && <p className="mt-1 text-xs text-muted-foreground">{a.comment}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
