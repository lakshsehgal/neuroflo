"use client";

import { useState, useMemo, useCallback, useTransition, useEffect } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  GripVertical,
  Users,
  AlertTriangle,
  Clock,
  Settings2,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, isOverdue } from "@/lib/utils";
import { updateTicket, updateTicketStatus } from "@/actions/tickets";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  rectIntersection,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

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

// Ticket column definitions
const TICKET_COLUMNS = [
  { key: "title", label: "Title", required: true },
  { key: "client", label: "Client", required: false },
  { key: "status", label: "Status", required: false },
  { key: "priority", label: "Priority", required: false },
  { key: "assignee", label: "Assignee", required: false },
  { key: "due", label: "Due", required: false },
  { key: "info", label: "Info", required: false },
];

const DEFAULT_TICKET_COLUMNS = ["title", "client", "status", "priority", "assignee", "due", "info"];

interface Props {
  tickets: TicketData[];
  users: User[];
  clients: Client[];
  workloadTickets: WorkloadTicket[];
}

export function TicketsContent({ tickets: initialTickets, users, clients, workloadTickets }: Props) {
  const [view, setView] = useState<"table" | "kanban" | "workload">("table");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neuroflo-ticket-columns");
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_TICKET_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("neuroflo-ticket-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Local optimistic ticket state for inline edits + kanban
  const [localTickets, setLocalTickets] = useState<TicketData[]>(initialTickets);
  const [isPending, startTransition] = useTransition();

  // Sync with server data when it changes
  const tickets = localTickets;

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

  const handleInlineUpdate = useCallback((ticketId: string, field: string, value: string) => {
    // Optimistic update
    setLocalTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        if (field === "status") return { ...t, status: value };
        if (field === "priority") return { ...t, priority: value };
        if (field === "dueDate") return { ...t, dueDate: value || null };
        if (field === "assigneeId") {
          const user = users.find((u) => u.id === value);
          return {
            ...t,
            assigneeId: value || null,
            assigneeName: user?.name || null,
            assigneeInitials: user ? user.name.split(" ").map((n) => n[0]).join("") : null,
          };
        }
        return t;
      })
    );

    // Persist to server
    startTransition(async () => {
      if (field === "status") {
        await updateTicketStatus(ticketId, value as Parameters<typeof updateTicketStatus>[1]);
      } else {
        await updateTicket(ticketId, { [field]: value || null });
      }
    });
  }, [users]);

  // Quick stats
  const totalCount = tickets.length;
  const urgentCount = tickets.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length;
  const overdueCount = tickets.filter((t) => t.dueDate && isOverdue(t.dueDate)).length;

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Creative Tickets</h1>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{totalCount} total</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span>{filtered.length} showing</span>
                {urgentCount > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-orange-600 font-medium">{urgentCount} high/urgent</span>
                  </>
                )}
                {overdueCount > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-red-600 font-medium">{overdueCount} overdue</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button asChild className="shadow-sm bg-primary hover:bg-primary/90">
            <Link href="/tickets/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card/50 p-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${view === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${view === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setView("workload")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${view === "workload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Workload
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-52 pl-8 text-xs bg-background"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
            <div className="h-4 w-px bg-border" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <Settings2 className="h-3 w-3" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-2">
                <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground">Toggle Columns</p>
                {TICKET_COLUMNS.filter((c) => !c.required).map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    {visibleColumns.includes(col.key) ? (
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className={visibleColumns.includes(col.key) ? "" : "text-muted-foreground"}>{col.label}</span>
                    {visibleColumns.includes(col.key) && <Check className="ml-auto h-3 w-3 text-primary" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
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
        {view === "table" && <TableView tickets={filtered} users={users} onUpdate={handleInlineUpdate} visibleColumns={visibleColumns} />}
        {view === "kanban" && <KanbanView tickets={filtered} onStatusChange={handleInlineUpdate} />}
        {view === "workload" && <WorkloadView tickets={workloadTickets} />}
      </div>
    </PageTransition>
  );
}

/* ─── Table View with Inline Editing ─── */
function TableView({
  tickets,
  users,
  onUpdate,
  visibleColumns,
}: {
  tickets: TicketData[];
  users: User[];
  onUpdate: (id: string, field: string, value: string) => void;
  visibleColumns: string[];
}) {
  const router = useRouter();
  const isCol = (key: string) => visibleColumns.includes(key);

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

  function handleRowClick(e: React.MouseEvent, ticketId: string) {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("select, button, input, [role='listbox'], [role='option'], [data-radix-collection-item], a")) return;
    router.push(`/tickets/${ticketId}`);
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Title</th>
            {isCol("client") && <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Client</th>}
            {isCol("status") && <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Status</th>}
            {isCol("priority") && <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Priority</th>}
            {isCol("assignee") && <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Assignee</th>}
            {isCol("due") && <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">Due</th>}
            {isCol("info") && <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 w-20">Info</th>}
          </tr>
        </thead>
        <AnimatedTableBody>
          {tickets.map((ticket) => {
            const isUrgent = ticket.priority === "URGENT" || ticket.priority === "HIGH";
            const isTicketOverdue = ticket.dueDate && isOverdue(ticket.dueDate);
            return (
              <AnimatedRow
                key={ticket.id}
                className={`border-b last:border-0 transition-colors cursor-pointer group ${
                  isTicketOverdue ? "bg-red-50/30 hover:bg-red-50/50" : isUrgent ? "hover:bg-orange-50/30" : "hover:bg-muted/30"
                }`}
                onClick={(e: React.MouseEvent) => handleRowClick(e, ticket.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      ticket.priority === "URGENT" ? "bg-red-500" :
                      ticket.priority === "HIGH" ? "bg-orange-500" :
                      ticket.priority === "MEDIUM" ? "bg-blue-500" : "bg-gray-300"
                    }`} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-1">
                        {ticket.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ticket.format && (
                          <span className="text-[10px] text-muted-foreground/70 font-medium uppercase">{ticket.format.replace(/_/g, " ")}</span>
                        )}
                        {ticket.assignedByName && (
                          <span className="text-[10px] text-muted-foreground/60">by {ticket.assignedByName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                {isCol("client") && (
                  <td className="px-3 py-3">
                    <span className="text-xs font-medium text-muted-foreground">{ticket.clientName || "\u2014"}</span>
                  </td>
                )}
                {isCol("status") && (
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select value={ticket.status} onValueChange={(v) => onUpdate(ticket.id, "status", v)}>
                      <SelectTrigger className="h-7 w-[140px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1.5 focus:ring-0 focus:ring-offset-0">
                        <Badge className={`${statusColors[ticket.status] || ""} text-[10px] border font-medium`} variant="secondary">
                          {statusLabels[ticket.status] || ticket.status.replace(/_/g, " ")}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {statusColumnOrder.map((s) => (
                          <SelectItem key={s} value={s}>
                            <Badge className={`${statusColors[s]} text-[10px] border`} variant="secondary">
                              {statusLabels[s]}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                )}
                {isCol("priority") && (
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select value={ticket.priority} onValueChange={(v) => onUpdate(ticket.id, "priority", v)}>
                      <SelectTrigger className="h-7 w-[95px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1.5 focus:ring-0 focus:ring-offset-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${
                            ticket.priority === "URGENT" ? "bg-red-500" :
                            ticket.priority === "HIGH" ? "bg-orange-500" :
                            ticket.priority === "MEDIUM" ? "bg-blue-500" : "bg-gray-400"
                          }`} />
                          <span className="text-xs font-medium capitalize">{ticket.priority.toLowerCase()}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                p === "URGENT" ? "bg-red-500" :
                                p === "HIGH" ? "bg-orange-500" :
                                p === "MEDIUM" ? "bg-blue-500" : "bg-gray-400"
                              }`} />
                              <span className="capitalize">{p.toLowerCase()}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                )}
                {isCol("assignee") && (
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Select value={ticket.assigneeId || "unassigned"} onValueChange={(v) => onUpdate(ticket.id, "assigneeId", v === "unassigned" ? "" : v)}>
                      <SelectTrigger className="h-7 w-[130px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1.5 focus:ring-0 focus:ring-offset-0">
                        {ticket.assigneeName ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 ring-1 ring-border">
                              <AvatarFallback className="text-[8px] bg-primary/10 font-semibold">{ticket.assigneeInitials}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate">{ticket.assigneeName}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground italic">Unassigned</span>}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned"><span className="text-muted-foreground">Unassigned</span></SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                )}
                {isCol("due") && (
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().split("T")[0] : ""}
                      onChange={(e) => onUpdate(ticket.id, "dueDate", e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className={`h-7 w-[125px] rounded-md border-0 bg-transparent px-1.5 text-xs hover:bg-muted/40 focus:bg-muted/40 focus:outline-none focus:ring-0 cursor-pointer ${
                        isTicketOverdue ? "font-bold text-red-600" : ticket.dueDate ? "text-foreground" : "text-muted-foreground"
                      }`}
                    />
                  </td>
                )}
                {isCol("info") && (
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      {ticket.revisionCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px]" title={`${ticket.revisionCount} revision(s)`}>
                          <FileText className="h-3 w-3" />
                          <span className="font-medium">{ticket.revisionCount}</span>
                        </span>
                      )}
                      {ticket.commentCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px]" title={`${ticket.commentCount} comment(s)`}>
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-medium">{ticket.commentCount}</span>
                        </span>
                      )}
                      {ticket.deliveryLink && (
                        <a href={ticket.deliveryLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()} title="View delivery">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                )}
              </AnimatedRow>
            );
          })}
        </AnimatedTableBody>
      </table>
    </div>
  );
}

/* ─── Kanban View with Drag & Drop ─── */

function DroppableKanbanColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[60px] rounded-lg p-1 transition-colors ${isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
    >
      {children}
    </div>
  );
}

function SortableKanbanCard({ ticket, onStatusChange }: { ticket: TicketData; onStatusChange: (id: string, field: string, value: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    data: { ticket },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCard ticket={ticket} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function KanbanCard({ ticket, dragHandleProps, isOverlay }: { ticket: TicketData; dragHandleProps?: Record<string, unknown>; isOverlay?: boolean }) {
  return (
    <Card className={`transition-all hover:shadow-md cursor-pointer border-l-[3px] ${isOverlay ? "shadow-xl rotate-2" : ""}`} style={{ borderLeftColor: getBorderColor(ticket.priority) }}>
      <CardContent className="p-3">
        <div className="flex items-start gap-1.5">
          <div
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/tickets/${ticket.id}`} className="hover:text-primary">
              <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
            </Link>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanView({ tickets, onStatusChange }: { tickets: TicketData[]; onStatusChange: (id: string, field: string, value: string) => void }) {
  const [activeTicket, setActiveTicket] = useState<TicketData | null>(null);
  const [localTickets, setLocalTickets] = useState<TicketData[] | null>(null);

  const currentTickets = localTickets || tickets;

  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, TicketData[]> = {};
    for (const col of kanbanColumns) grouped[col.key] = [];
    for (const t of currentTickets) {
      if (grouped[t.status]) grouped[t.status].push(t);
    }
    return grouped;
  }, [currentTickets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findColumn = useCallback((id: string | number): string | null => {
    if (kanbanColumns.find((c) => c.key === id)) return id as string;
    for (const col of kanbanColumns) {
      if (ticketsByStatus[col.key]?.find((t) => t.id === id)) return col.key;
    }
    return null;
  }, [ticketsByStatus]);

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const rectCollisions = rectIntersection(args);
    const columnIds = kanbanColumns.map((c) => c.key);
    const overColumn = rectCollisions.find((c) => columnIds.includes(c.id as string));
    if (overColumn) return [overColumn];
    const closestCollisions = closestCenter(args);
    if (closestCollisions.length > 0) return closestCollisions;
    return rectCollisions;
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = (event.active.data.current as { ticket: TicketData })?.ticket;
    if (ticket) setActiveTicket(ticket);
    if (!localTickets) setLocalTickets([...tickets]);
  }, [tickets, localTickets]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumn(active.id);
    const overCol = findColumn(over.id);
    if (!activeCol || !overCol || activeCol === overCol) return;

    setLocalTickets((prev) => {
      const source = prev || tickets;
      return source.map((t) =>
        t.id === active.id ? { ...t, status: overCol } : t
      );
    });
  }, [findColumn, tickets]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) {
      setLocalTickets(null);
      return;
    }

    const targetCol = findColumn(over.id);
    if (!targetCol) {
      setLocalTickets(null);
      return;
    }

    // Find the ticket's new status from local state
    const movedTicket = (localTickets || tickets).find((t) => t.id === active.id);
    if (movedTicket && movedTicket.status !== tickets.find((t) => t.id === active.id)?.status) {
      // Persist the status change — this calls the parent handler which does optimistic update + server call
      onStatusChange(movedTicket.id, "status", movedTicket.status);
    }

    setLocalTickets(null);
  }, [findColumn, localTickets, tickets, onStatusChange]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {kanbanColumns.map((column, i) => {
          const items = ticketsByStatus[column.key] || [];
          const itemIds = items.map((t) => t.id);
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
              <DroppableKanbanColumn id={column.key}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
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
                        <SortableKanbanCard ticket={ticket} onStatusChange={onStatusChange} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DroppableKanbanColumn>
            </motion.div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="w-[260px]">
            <KanbanCard ticket={activeTicket} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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

/* ─── Workload View with Charts ─── */
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

    // Weekly data
    const weeks: { label: string; shortLabel: string; start: Date; end: Date }[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    for (let i = 0; i < 4; i++) {
      const start = new Date(startOfWeek);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      weeks.push({
        label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        shortLabel: `W${i + 1}`,
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

    // Status distribution
    const statusCounts: Record<string, number> = {};
    for (const t of tickets) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }
    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status.replace(/_/g, " "),
      value: count,
      status,
    }));

    // Bar chart data: tickets per person
    const barData = rows
      .filter((r) => r.id !== "_unassigned")
      .map((r) => ({
        name: r.name.split(" ")[0],
        total: r.total,
        ...weeks.reduce((acc, w, i) => ({ ...acc, [w.shortLabel]: r.weekCounts[i] }), {}),
      }));

    return { weeks, rows, statusData, barData };
  }, [tickets]);

  const overdueCount = tickets.filter((t) => t.dueDate && isOverdue(t.dueDate)).length;
  const unassignedCount = tickets.filter((t) => !t.assigneeId).length;
  const teamCount = workloadData.rows.filter((r) => r.id !== "_unassigned").length;
  const avgPerPerson = teamCount > 0
    ? Math.round(tickets.filter((t) => t.assigneeId).length / teamCount)
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Open</p>
                <p className="mt-1 text-2xl font-bold">{tickets.length}</p>
              </div>
              <div className="rounded-full bg-blue-50 p-2.5">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Team Members</p>
                <p className="mt-1 text-2xl font-bold">{teamCount}</p>
              </div>
              <div className="rounded-full bg-purple-50 p-2.5">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
                <p className={`mt-1 text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</p>
              </div>
              <div className="rounded-full bg-red-50 p-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Unassigned</p>
                <p className={`mt-1 text-2xl font-bold ${unassignedCount > 0 ? "text-orange-600" : ""}`}>{unassignedCount}</p>
              </div>
              <div className="rounded-full bg-orange-50 p-2.5">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Workload bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tickets per Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            {workloadData.barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={workloadData.barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  {workloadData.weeks.map((w, i) => (
                    <Bar
                      key={w.shortLabel}
                      dataKey={w.shortLabel}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={i === workloadData.weeks.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                      name={w.label}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No assigned tickets to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {workloadData.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={workloadData.statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {workloadData.statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                    iconSize={8}
                    formatter={(value) => <span className="text-[10px] text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed workload table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Workload Breakdown</CardTitle>
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
                {workloadData.rows.map((row, i) => {
                  const maxCount = Math.max(1, ...workloadData.rows.flatMap((r) => r.weekCounts));
                  return (
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
                        <td key={wi} className="px-2 py-3">
                          <div className="flex justify-center">
                            <WorkloadBar count={count} max={maxCount} />
                          </div>
                        </td>
                      ))}
                      <td className="px-2 py-3 text-center">
                        {row.noDueDate > 0 ? (
                          <span className="text-xs font-medium text-orange-600">{row.noDueDate}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{"\u2014"}</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
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

function WorkloadBar({ count, max }: { count: number; max: number }) {
  if (count === 0) {
    return (
      <div className="h-6 w-full flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">0</span>
      </div>
    );
  }

  const ratio = count / max;
  let bgColor = "bg-blue-200";
  if (ratio > 0.75) bgColor = "bg-red-400";
  else if (ratio > 0.5) bgColor = "bg-orange-300";
  else if (ratio > 0.25) bgColor = "bg-blue-300";

  const width = Math.max(24, ratio * 100);

  return (
    <div className="flex items-center gap-1.5 w-full max-w-[120px]">
      <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${bgColor} flex items-center justify-center`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className="text-[10px] font-semibold text-white drop-shadow-sm">{count}</span>
        </motion.div>
      </div>
    </div>
  );
}
