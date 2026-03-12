"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  PageTransition,
  AnimatedTableBody,
  AnimatedRow,
} from "@/components/motion";
import { Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";

const statusColors: Record<string, string> = {
  NEW_REQUEST: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SIZE_CHANGES: "bg-cyan-100 text-cyan-800",
  READY_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
  SENT_TO_CLIENT: "bg-indigo-100 text-indigo-800",
  NEEDS_EDIT: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  AWAITING_EDITS: "bg-amber-100 text-amber-800",
  ON_HOLD: "bg-slate-100 text-slate-800",
};

const statusLabels: Record<string, string> = {
  NEW_REQUEST: "New Request",
  IN_PROGRESS: "In Progress",
  SIZE_CHANGES: "Size Changes",
  READY_FOR_APPROVAL: "Ready for Approval",
  SENT_TO_CLIENT: "Sent to Client",
  NEEDS_EDIT: "Needs Edit",
  APPROVED: "Approved",
  AWAITING_EDITS: "Awaiting Edits",
  ON_HOLD: "On Hold",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

type TicketData = {
  id: string;
  title: string;
  status: string;
  priority: string;
  format: string | null;
  creativeType: string | null;
  clientName: string | null;
  dueDate: string | null;
  deliveryLink: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  assignedByName: string | null;
};

export function TicketsContent({ tickets }: { tickets: TicketData[] }) {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Creative Tickets</h1>
            <p className="text-muted-foreground">Manage creative requests and approvals</p>
          </div>
          <Button asChild>
            <Link href="/tickets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No tickets yet. Create your first creative request.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium">Title</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Client</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Urgency</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Format</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Assignee</th>
                  <th className="px-3 py-3 text-left text-xs font-medium">Due</th>
                  <th className="px-3 py-3 text-left text-xs font-medium w-10"></th>
                </tr>
              </thead>
              <AnimatedTableBody>
                {tickets.map((ticket) => (
                  <AnimatedRow key={ticket.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/tickets/${ticket.id}`} className="text-sm font-medium hover:underline">{ticket.title}</Link>
                      {ticket.assignedByName && (
                        <p className="text-[10px] text-muted-foreground">by {ticket.assignedByName}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.clientName || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge className={`${statusColors[ticket.status] || ""} text-[10px]`} variant="secondary">
                        {statusLabels[ticket.status] || ticket.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={`${priorityColors[ticket.priority] || ""} text-[10px]`} variant="secondary">{ticket.priority}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.format?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-3 py-3">
                      {ticket.assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{ticket.assigneeInitials}</AvatarFallback></Avatar>
                          <span className="text-xs">{ticket.assigneeName}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {ticket.dueDate ? (
                        <span className={`text-xs ${isOverdue(ticket.dueDate) ? "font-medium text-red-600" : "text-muted-foreground"}`}>
                          {formatDate(new Date(ticket.dueDate))}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {ticket.deliveryLink ? (
                        <a href={ticket.deliveryLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
