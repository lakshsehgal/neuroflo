"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageTransition,
  AnimatedTableBody,
  AnimatedRow,
} from "@/components/motion";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ExternalLink,
  Search,
  X,
  LayoutList,
  Columns3,
  BarChart3,
  Filter,
  MessageSquare,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";

const statusColors: Record<string, string> = {
  NEW_REQUEST: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  SIZE_CHANGES: "bg-cyan-50 text-cyan-700 border-cyan-200",
  READY_FOR_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  SENT_TO_CLIENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  NEEDS_EDIT: "bg-orange-50 text-orange-700 border-orange-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  AWAITING_EDITS: "bg-yellow-50 text-yellow-700 border-yellow-200",
  ON_HOLD: "bg-gray-100 text-gray-600 border-gray-200",
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

const statusColumnOrder = [
  "NEW_REQUEST",
  "IN_PROGRESS",
  "SIZE_CHANGES",
  "READY_FOR_APPROVAL",
  "SENT_TO_CLIENT",
  "NEEDS_EDIT",
  "AWAITING_EDITS",
  "ON_HOLD",
  "APPROVED",
];

const kanbanColumns = [
  { key: "NEW_REQUEST", label: "New Request", color: "bg-slate-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { key: "SIZE_CHANGES", label: "Size Changes", color: "bg-cyan-500" },
  { key: "READY_FOR_APPROVAL", label: "Ready", color: "bg-amber-500" },
  { key: "SENT_TO_CLIENT", label: "Sent to Client", color: "bg-indigo-500" },
  { key: "NEEDS_EDIT", label: "Needs Edit", color: "bg-orange-500" },
  { key: "AWAITING_EDITS", label: "Awaiting Edits", color: "bg-yellow-500" },
  { key: "ON_HOLD", label: "On Hold", color: "bg-gray-400" },
  { key: "APPROVED", label: "Approved", color: "bg-emerald-500" },
];

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
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
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  assignedByName: string | null;
  revisionCount: number;
  commentCount: number;
};

type WorkloadTicket = {
  id: string;
  status: string;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
};

type User = { id: string; name: string; avatar: string | null };
type Client = { id: string; name: string };

interface Props {
  tickets: TicketData[];
  users: User[];
  clients: Client[];
  workloadTickets: WorkloadTicket[];
}

export function TicketsContent({ tickets, users, clients, workloadTickets }: Props) {
  const [view, setView] = useState<"table" | "kanban" | "workload">("table");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.clientName?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterAssignee !== "all" && t.assigneeId !== filterAssignee) return false;
      if (filterClient !== "all" && t.clientName !== filterClient) return false;
      return true;
    });
  }, [tickets, search, filterStatus, filterPriority, filterAssignee, filterClient]);

  const activeFilterCount = [filterStatus, filterPriority, filterAssignee, filterClient].filter((f) => f !== "all").length;

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterAssignee("all");
    setFilterClient("all");
    setSearch("");
  };

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Creative Tickets</h1>
            <p className="text-sm text-muted-foreground">Manage creative requests and approvals</p>
          </div>
          <Button asChild size="sm" className="shadow-sm">
            <Link href="/tickets/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Ticket
            </Link>
          </Button>
        </div>

        {/* View switcher + search + filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setView("workload")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === "workload" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Workload
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-48 pl-8 text-xs"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusColumnOrder.map((s) => (
                      <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Assignee" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {view === "table" && <TableView tickets={filtered} />}
        {view === "kanban" && <KanbanView tickets={filtered} />}
        {view === "workload" && <WorkloadView tickets={workloadTickets} />}
      </div>
    </PageTransition>
  );
}

/* ─── Table View ─── */
function TableView({ tickets }: { tickets: TicketData[] }) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-3 mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No tickets match your filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Format</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assignee</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16">Info</th>
          </tr>
        </thead>
        <AnimatedTableBody>
          {tickets.map((ticket) => (
            <AnimatedRow key={ticket.id} className="border-b last:border-0 transition-colors hover:bg-muted/20">
              <td className="px-4 py-3">
                <Link href={`/tickets/${ticket.id}`} className="text-sm font-medium hover:text-primary transition-colors">{ticket.title}</Link>
                {ticket.assignedByName && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">by {ticket.assignedByName}</p>
                )}
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.clientName || "\u2014"}</td>
              <td className="px-3 py-3">
                <Badge className={`${statusColors[ticket.status] || ""} text-[10px] border`} variant="secondary">
                  {statusLabels[ticket.status] || ticket.status.replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="px-3 py-3">
                <Badge className={`${priorityColors[ticket.priority] || ""} text-[10px]`} variant="secondary">{ticket.priority}</Badge>
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.format?.replace(/_/g, " ") || "\u2014"}</td>
              <td className="px-3 py-3">
                {ticket.assigneeName ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5 ring-1 ring-border"><AvatarFallback className="text-[8px] bg-primary/10">{ticket.assigneeInitials}</AvatarFallback></Avatar>
                    <span className="text-xs">{ticket.assigneeName}</span>
                  </div>
                ) : <span className="text-xs text-muted-foreground">{"\u2014"}</span>}
              </td>
              <td className="px-3 py-3">
                {ticket.dueDate ? (
                  <span className={`text-xs ${isOverdue(ticket.dueDate) ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                    {formatDate(new Date(ticket.dueDate))}
                  </span>
                ) : <span className="text-xs text-muted-foreground">{"\u2014"}</span>}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {ticket.revisionCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px]"><FileText className="h-3 w-3" />{ticket.revisionCount}</span>
                  )}
                  {ticket.commentCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px]"><MessageSquare className="h-3 w-3" />{ticket.commentCount}</span>
                  )}
                  {ticket.deliveryLink && (
                    <a href={ticket.deliveryLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </td>
            </AnimatedRow>
          ))}
        </AnimatedTableBody>
      </table>
    </div>
  );
}

/* ─── Kanban View ─── */
function KanbanView({ tickets }: { tickets: TicketData[] }) {
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, TicketData[]> = {};
    for (const col of kanbanColumns) grouped[col.key] = [];
    for (const t of tickets) {
      if (grouped[t.status]) grouped[t.status].push(t);
    }
    return grouped;
  }, [tickets]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {kanbanColumns.map((column, i) => {
        const items = ticketsByStatus[column.key] || [];
        return (
          <motion.div
            key={column.key}
            className="flex-shrink-0 w-[260px]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            <div className="mb-2 rounded-lg overflow-hidden">
              <div className={`h-1 ${column.color}`} />
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                <h3 className="text-xs font-semibold">{column.label}</h3>
                <Badge variant="secondary" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                  {items.length}
                </Badge>
              </div>
            </div>
            <div className="space-y-2 min-h-[60px]">
              <AnimatePresence mode="popLayout">
                {items.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Link href={`/tickets/${ticket.id}`}>
                      <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-l-[3px]" style={{ borderLeftColor: getBorderColor(ticket.priority) }}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
                          {ticket.clientName && (
                            <p className="text-[10px] text-muted-foreground mt-1">{ticket.clientName}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge className={`${priorityColors[ticket.priority]} text-[9px] px-1.5 py-0`} variant="secondary">{ticket.priority}</Badge>
                            {ticket.format && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{ticket.format.replace(/_/g, " ")}</Badge>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              {ticket.dueDate && (
                                <span className={`text-[10px] ${isOverdue(ticket.dueDate) ? "text-red-600 font-medium" : ""}`}>
                                  {formatDate(new Date(ticket.dueDate))}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {ticket.commentCount > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground"><MessageSquare className="h-2.5 w-2.5" />{ticket.commentCount}</span>
                              )}
                              {ticket.assigneeName && (
                                <Avatar className="h-5 w-5 ring-1 ring-border">
                                  <AvatarFallback className="text-[8px] bg-primary/10">{ticket.assigneeInitials}</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function getBorderColor(priority: string) {
  switch (priority) {
    case "URGENT": return "#ef4444";
    case "HIGH": return "#f97316";
    case "MEDIUM": return "#3b82f6";
    default: return "#d1d5db";
  }
}

/* ─── Workload View ─── */
function WorkloadView({ tickets }: { tickets: WorkloadTicket[] }) {
  const workloadData = useMemo(() => {
    const byAssignee: Record<string, { name: string; avatar: string | null; tickets: WorkloadTicket[] }> = {};

    for (const t of tickets) {
      const key = t.assigneeId || "_unassigned";
      if (!byAssignee[key]) {
        byAssignee[key] = { name: t.assigneeName || "Unassigned", avatar: t.assigneeAvatar, tickets: [] };
      }
      byAssignee[key].tickets.push(t);
    }

    const weeks: { label: string; start: Date; end: Date }[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    for (let i = 0; i < 4; i++) {
      const start = new Date(startOfWeek);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const weekNum = getWeekNumber(start);
      weeks.push({
        label: `W${weekNum} ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        start,
        end,
      });
    }

    const rows = Object.entries(byAssignee)
      .sort((a, b) => b[1].tickets.length - a[1].tickets.length)
      .map(([id, data]) => {
        const weekCounts = weeks.map((week) => {
          return data.tickets.filter((t) => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            return due >= week.start && due <= week.end;
          }).length;
        });
        const noDueDate = data.tickets.filter((t) => !t.dueDate).length;
        return { id, name: data.name, avatar: data.avatar, total: data.tickets.length, weekCounts, noDueDate };
      });

    return { weeks, rows };
  }, [tickets]);

  const maxCount = Math.max(1, ...workloadData.rows.flatMap((r) => r.weekCounts));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Open</p>
            <p className="mt-1 text-2xl font-bold">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Team Members</p>
            <p className="mt-1 text-2xl font-bold">{workloadData.rows.filter((r) => r.id !== "_unassigned").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avg per Person</p>
            <p className="mt-1 text-2xl font-bold">
              {workloadData.rows.filter((r) => r.id !== "_unassigned").length > 0
                ? Math.round(tickets.filter((t) => t.assigneeId).length / workloadData.rows.filter((r) => r.id !== "_unassigned").length)
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Unassigned</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{tickets.filter((t) => !t.assigneeId).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Team Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-48">Team Member</th>
                  <th className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground w-16">Total</th>
                  {workloadData.weeks.map((week) => (
                    <th key={week.label} className="px-2 py-2 text-center text-[10px] font-medium text-muted-foreground min-w-[120px]">
                      {week.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground w-20">No Date</th>
                </tr>
              </thead>
              <tbody>
                {workloadData.rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    className="border-b last:border-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 ring-1 ring-border">
                          <AvatarFallback className="text-[10px] bg-primary/10">
                            {row.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-sm font-bold">{row.total}</span>
                    </td>
                    {row.weekCounts.map((count, wi) => (
                      <td key={wi} className="px-2 py-3 text-center">
                        <div className="flex justify-center">
                          <WorkloadBubble count={count} max={maxCount} />
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center">
                      {row.noDueDate > 0 ? (
                        <span className="text-xs text-muted-foreground">{row.noDueDate}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {workloadData.rows.length === 0 && (
                  <tr>
                    <td colSpan={workloadData.weeks.length + 3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No open tickets to show workload data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkloadBubble({ count, max }: { count: number; max: number }) {
  if (count === 0) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted/40 flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">0</span>
      </div>
    );
  }

  const ratio = count / max;
  let colorClass = "bg-blue-100 text-blue-700 ring-blue-200";
  if (ratio > 0.75) colorClass = "bg-red-100 text-red-700 ring-red-200";
  else if (ratio > 0.5) colorClass = "bg-blue-500 text-white ring-blue-300";
  else if (ratio > 0.25) colorClass = "bg-blue-200 text-blue-800 ring-blue-200";

  const size = 28 + ratio * 16;

  return (
    <div
      className={`rounded-full flex items-center justify-center ring-1 font-semibold ${colorClass}`}
      style={{ width: size, height: size, fontSize: count >= 10 ? 10 : 11 }}
    >
      {count}
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
