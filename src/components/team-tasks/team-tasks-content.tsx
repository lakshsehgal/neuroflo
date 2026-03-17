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
  Search,
  X,
  LayoutList,
  Columns3,
  BarChart3,
  Filter,
  MessageSquare,
  Users,
  AlertTriangle,
  Settings2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { formatDate, isOverdue } from "@/lib/utils";
import { updateTeamTask, updateTeamTaskStatus, createTeamTask } from "@/actions/team-tasks";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
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
  TODO: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  IN_REVIEW: "bg-purple-50 text-purple-700 border-purple-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ON_HOLD: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  DONE: "Done",
  ON_HOLD: "On Hold",
};

const statusColumnOrder = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "BLOCKED",
  "DONE",
  "ON_HOLD",
];

const kanbanColumns = [
  { key: "TODO", label: "To Do", color: "bg-slate-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { key: "IN_REVIEW", label: "In Review", color: "bg-purple-500" },
  { key: "BLOCKED", label: "Blocked", color: "bg-red-500" },
  { key: "DONE", label: "Done", color: "bg-emerald-500" },
  { key: "ON_HOLD", label: "On Hold", color: "bg-gray-400" },
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

type TeamTaskData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  teamId: string;
  teamName: string;
  departmentName: string;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  createdByName: string | null;
  commentCount: number;
};

type WorkloadTask = {
  id: string;
  status: string;
  dueDate: string | null;
  teamId: string;
  teamName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
};

type User = { id: string; name: string; avatar: string | null };
type TeamInfo = {
  id: string;
  name: string;
  department: { id: string; name: string };
};

const TASK_COLUMNS = [
  { key: "title", label: "Title", required: true },
  { key: "status", label: "Status", required: false },
  { key: "priority", label: "Priority", required: false },
  { key: "assignee", label: "Assignee", required: false },
  { key: "due", label: "Due", required: false },
  { key: "info", label: "Info", required: false },
];

const DEFAULT_TASK_COLUMNS = [
  "title",
  "status",
  "priority",
  "assignee",
  "due",
  "info",
];

interface Props {
  tasks: TeamTaskData[];
  users: User[];
  teams: TeamInfo[];
  userTeamIds: string[];
  initialTeamFilter?: string | null;
  workloadTasks: WorkloadTask[];
}

export function TeamTasksContent({
  tasks: initialTasks,
  users,
  teams,
  userTeamIds,
  initialTeamFilter,
  workloadTasks,
}: Props) {
  const [view, setView] = useState<"table" | "kanban" | "workload">("table");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  // Priority: URL param > user's single team > all
  const [selectedTeamTab, setSelectedTeamTab] = useState<string>(() => {
    if (initialTeamFilter && teams.some((t) => t.id === initialTeamFilter)) return initialTeamFilter;
    if (userTeamIds.length === 1) return userTeamIds[0];
    return "all";
  });
  const [showFilters, setShowFilters] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neuroflo-team-task-columns");
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_TASK_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      "neuroflo-team-task-columns",
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const [localTasks, setLocalTasks] = useState<TeamTaskData[]>(initialTasks);
  const [isPending, startTransition] = useTransition();

  const tasks = localTasks;

  // Compute per-team task counts for tabs
  const teamTabStats = useMemo(() => {
    const stats = new Map<string, { total: number; urgent: number; overdue: number }>();
    tasks.forEach((t) => {
      const existing = stats.get(t.teamId) || { total: 0, urgent: 0, overdue: 0 };
      existing.total++;
      if (t.priority === "URGENT" || t.priority === "HIGH") existing.urgent++;
      if (t.dueDate && isOverdue(t.dueDate)) existing.overdue++;
      stats.set(t.teamId, existing);
    });
    return stats;
  }, [tasks]);

  // When a team tab is selected, it acts as the primary team filter
  const effectiveTeamFilter = selectedTeamTab !== "all" ? selectedTeamTab : filterTeam;

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (
        search &&
        !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.teamName.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority)
        return false;
      if (filterAssignee !== "all" && t.assigneeId !== filterAssignee)
        return false;
      if (effectiveTeamFilter !== "all" && t.teamId !== effectiveTeamFilter) return false;
      return true;
    });
  }, [tasks, search, filterStatus, filterPriority, filterAssignee, effectiveTeamFilter]);

  const activeFilterCount = [
    filterStatus,
    filterPriority,
    filterAssignee,
    // Only count dropdown team filter when no team tab is selected
    selectedTeamTab === "all" ? filterTeam : "all",
  ].filter((f) => f !== "all").length;

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterAssignee("all");
    setFilterTeam("all");
    setSearch("");
  };

  const handleInlineUpdate = useCallback(
    (taskId: string, field: string, value: string) => {
      setLocalTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          if (field === "status") return { ...t, status: value };
          if (field === "priority") return { ...t, priority: value };
          if (field === "dueDate") return { ...t, dueDate: value || null };
          if (field === "title") return { ...t, title: value };
          if (field === "assigneeId") {
            const user = users.find((u) => u.id === value);
            return {
              ...t,
              assigneeId: value || null,
              assigneeName: user?.name || null,
              assigneeInitials: user
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : null,
            };
          }
          return t;
        })
      );

      startTransition(async () => {
        if (field === "status") {
          await updateTeamTaskStatus(
            taskId,
            value as Parameters<typeof updateTeamTaskStatus>[1]
          );
        } else {
          await updateTeamTask(taskId, { [field]: value || null });
        }
      });
    },
    [users]
  );

  // Quick stats (scoped to selected team tab)
  const scopedTasks = selectedTeamTab !== "all" ? tasks.filter((t) => t.teamId === selectedTeamTab) : tasks;
  const totalCount = scopedTasks.length;
  const urgentCount = scopedTasks.filter(
    (t) => t.priority === "URGENT" || t.priority === "HIGH"
  ).length;
  const overdueCount = scopedTasks.filter(
    (t) => t.dueDate && isOverdue(t.dueDate)
  ).length;
  const blockedCount = scopedTasks.filter((t) => t.status === "BLOCKED").length;

  // Group tasks by team, then by assignee within each team
  type AssigneeGroup = {
    assigneeId: string | null;
    assigneeName: string | null;
    assigneeInitials: string | null;
    tasks: TeamTaskData[];
  };
  type TeamGroup = {
    teamName: string;
    deptName: string;
    tasks: TeamTaskData[];
    assigneeGroups: AssigneeGroup[];
  };

  const teamGroups = useMemo(() => {
    const groups = new Map<string, TeamGroup>();
    filtered.forEach((t) => {
      const existing = groups.get(t.teamId) || {
        teamName: t.teamName,
        deptName: t.departmentName,
        tasks: [],
        assigneeGroups: [],
      };
      existing.tasks.push(t);
      groups.set(t.teamId, existing);
    });

    // Build assignee sub-groups for each team
    groups.forEach((group) => {
      const byAssignee = new Map<string, AssigneeGroup>();
      group.tasks.forEach((t) => {
        const key = t.assigneeId || "__unassigned__";
        const existing = byAssignee.get(key) || {
          assigneeId: t.assigneeId,
          assigneeName: t.assigneeName,
          assigneeInitials: t.assigneeInitials,
          tasks: [],
        };
        existing.tasks.push(t);
        byAssignee.set(key, existing);
      });
      // Sort: assigned first (alphabetically), unassigned last
      group.assigneeGroups = Array.from(byAssignee.values()).sort((a, b) => {
        if (!a.assigneeId) return 1;
        if (!b.assigneeId) return -1;
        return (a.assigneeName || "").localeCompare(b.assigneeName || "");
      });
    });

    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {selectedTeamTab !== "all"
                ? `${teams.find((t) => t.id === selectedTeamTab)?.name || "Team"} Tasks`
                : "Team Tasks"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalCount} task{totalCount !== 1 ? "s" : ""}
              {filtered.length !== totalCount && ` \u00B7 ${filtered.length} showing`}
              {overdueCount > 0 && (
                <span className="text-red-600 font-medium"> \u00B7 {overdueCount} overdue</span>
              )}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={selectedTeamTab !== "all" ? `/team-tasks/new?team=${selectedTeamTab}` : "/team-tasks/new"}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Task
            </Link>
          </Button>
        </div>

        {/* Team Tabs */}
        {teams.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto border-b pb-2">
            <button
              onClick={() => { setSelectedTeamTab("all"); setFilterTeam("all"); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                selectedTeamTab === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All ({tasks.length})
            </button>
            {teams.map((team) => {
              const stats = teamTabStats.get(team.id);
              const count = stats?.total || 0;
              const hasOverdue = (stats?.overdue || 0) > 0;
              return (
                <button
                  key={team.id}
                  onClick={() => { setSelectedTeamTab(team.id); setFilterTeam("all"); }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedTeamTab === team.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {team.name} ({count})
                  {hasOverdue && selectedTeamTab !== team.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-lg border p-0.5">
              <button
                onClick={() => setView("table")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Columns3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("workload")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${view === "workload" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Link href="/team-tasks/dashboard">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 pl-8 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3" />
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1.5">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Columns
                </p>
                {TASK_COLUMNS.filter((c) => !c.required).map((col) => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                  >
                    {visibleColumns.includes(col.key) ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <div className="h-3 w-3" />
                    )}
                    <span className={visibleColumns.includes(col.key) ? "" : "text-muted-foreground"}>
                      {col.label}
                    </span>
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
                {selectedTeamTab === "all" && (
                  <Select value={filterTeam} onValueChange={setFilterTeam}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.department.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={filterStatus}
                  onValueChange={setFilterStatus}
                >
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusColumnOrder.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterPriority}
                  onValueChange={setFilterPriority}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterAssignee}
                  onValueChange={setFilterAssignee}
                >
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {view === "table" && (
          <TableView
            teamGroups={teamGroups}
            users={users}
            onUpdate={handleInlineUpdate}
            onTaskAdded={(task: TeamTaskData) => setLocalTasks((prev) => [...prev, task])}
            visibleColumns={visibleColumns}
          />
        )}
        {view === "kanban" && (
          <KanbanView tasks={filtered} onStatusChange={handleInlineUpdate} />
        )}
        {view === "workload" && (
          <WorkloadView
            tasks={selectedTeamTab !== "all" ? workloadTasks.filter((t) => t.teamId === selectedTeamTab) : workloadTasks}
          />
        )}
      </div>
    </PageTransition>
  );
}

/* ─── Table View Grouped by Team ─── */
function TableView({
  teamGroups,
  users,
  onUpdate,
  onTaskAdded,
  visibleColumns,
}: {
  teamGroups: [
    string,
    {
      teamName: string;
      deptName: string;
      tasks: TeamTaskData[];
      assigneeGroups: {
        assigneeId: string | null;
        assigneeName: string | null;
        assigneeInitials: string | null;
        tasks: TeamTaskData[];
      }[];
    },
  ][];
  users: User[];
  onUpdate: (id: string, field: string, value: string) => void;
  onTaskAdded: (task: TeamTaskData) => void;
  visibleColumns: string[];
}) {
  const isCol = (key: string) => visibleColumns.includes(key);

  if (teamGroups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No tasks found. Create your first task to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {teamGroups.map(([teamId, group]) => (
        <Card key={teamId}>
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/20">
            <h3 className="font-semibold text-sm">{group.teamName}</h3>
            <span className="text-xs text-muted-foreground">
              {group.deptName}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
            </span>
          </div>

          {group.assigneeGroups.map((ag) => (
            <div key={ag.assigneeId || "__unassigned__"}>
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/10">
                {ag.assigneeId ? (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px]">
                        {ag.assigneeInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{ag.assigneeName}</span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Unassigned</span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {ag.tasks.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <AnimatedTableBody>
                    {ag.tasks.map((task) => (
                      <AnimatedRow
                        key={task.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <EditableTitle
                            value={task.title}
                            onSave={(v) => onUpdate(task.id, "title", v)}
                          />
                        </td>
                        {isCol("status") && (
                          <td className="px-3 py-2.5">
                            <Select
                              value={task.status}
                              onValueChange={(v) =>
                                onUpdate(task.id, "status", v)
                              }
                            >
                              <SelectTrigger className="h-7 w-28 text-xs border-0 bg-transparent px-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0.5 ${statusColors[task.status] || ""}`}
                                >
                                  {statusLabels[task.status] || task.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {statusColumnOrder.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {statusLabels[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        )}
                        {isCol("priority") && (
                          <td className="px-3 py-2.5">
                            <Select
                              value={task.priority}
                              onValueChange={(v) =>
                                onUpdate(task.id, "priority", v)
                              }
                            >
                              <SelectTrigger className="h-7 w-24 text-xs border-0 bg-transparent px-0">
                                <Badge
                                  className={`text-[10px] px-2 py-0.5 ${priorityColors[task.priority] || ""}`}
                                >
                                  {task.priority}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        )}
                        {isCol("assignee") && (
                          <td className="px-3 py-2.5">
                            <Select
                              value={task.assigneeId || "unassigned"}
                              onValueChange={(v) =>
                                onUpdate(
                                  task.id,
                                  "assigneeId",
                                  v === "unassigned" ? "" : v
                                )
                              }
                            >
                              <SelectTrigger className="h-7 w-32 text-xs border-0 bg-transparent px-0">
                                {task.assigneeName ? (
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[9px]">
                                        {task.assigneeInitials}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-xs">
                                      {task.assigneeName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    --
                                  </span>
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  Unassigned
                                </SelectItem>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        )}
                        {isCol("due") && (
                          <td className="px-3 py-2.5">
                            {task.dueDate ? (
                              <span
                                className={`text-xs ${
                                  isOverdue(task.dueDate)
                                    ? "text-red-600 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatDate(task.dueDate)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                --
                              </span>
                            )}
                          </td>
                        )}
                        {isCol("info") && (
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {task.commentCount > 0 && (
                                <span className="flex items-center gap-0.5 text-xs">
                                  <MessageSquare className="h-3 w-3" />
                                  {task.commentCount}
                                </span>
                              )}
                              {task.dueDate && isOverdue(task.dueDate) && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          </td>
                        )}
                      </AnimatedRow>
                    ))}
                  </AnimatedTableBody>
                </table>
              </div>
            </div>
          ))}

          <InlineAddRow teamId={teamId} onCreated={onTaskAdded} />
        </Card>
      ))}
    </div>
  );
}

/* ─── Editable Title ─── */
function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="h-7 text-sm font-medium px-1 -ml-1"
      />
    );
  }

  return (
    <span
      className="font-medium text-sm line-clamp-1 cursor-text hover:bg-muted/40 rounded px-1 -ml-1 py-0.5"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      {value}
    </span>
  );
}

/* ─── Inline Add Row ─── */
function InlineAddRow({
  teamId,
  onCreated,
}: {
  teamId: string;
  onCreated: (task: TeamTaskData) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setLoading(true);
    const result = await createTeamTask({ teamId, title: title.trim() });
    setLoading(false);
    if (result.success && result.data) {
      setTitle("");
      setIsAdding(false);
      onCreated(result.data as TeamTaskData);
    }
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/20">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") { setIsAdding(false); setTitle(""); }
        }}
        placeholder="Task title..."
        className="h-8 text-xs flex-1"
        disabled={loading}
      />
      <Button
        size="sm"
        className="h-8 text-xs px-3"
        onClick={handleSubmit}
        disabled={loading || !title.trim()}
      >
        {loading ? "Adding..." : "Add"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 text-xs px-2"
        onClick={() => { setIsAdding(false); setTitle(""); }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ─── Kanban View ─── */
function KanbanView({
  tasks,
  onStatusChange,
}: {
  tasks: TeamTaskData[];
  onStatusChange: (id: string, field: string, value: string) => void;
}) {
  const [activeTask, setActiveTask] = useState<TeamTaskData | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const activeId = String(active.id);

    // Check if dropped on a column
    const targetColumn = kanbanColumns.find((c) => c.key === overId);
    if (targetColumn) {
      const task = tasks.find((t) => t.id === activeId);
      if (task && task.status !== targetColumn.key) {
        onStatusChange(activeId, "status", targetColumn.key);
      }
      return;
    }

    // Dropped on another task — get its column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === activeId);
      if (task && task.status !== overTask.status) {
        onStatusChange(activeId, "status", overTask.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {kanbanColumns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <KanbanColumn key={col.key} column={col} tasks={colTasks} />
          );
        })}
      </div>
      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  tasks,
}: {
  column: { key: string; label: string; color: string };
  tasks: TeamTaskData[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-lg border bg-muted/20 transition-colors ${isOver ? "border-primary/50 bg-primary/5" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        <div className={`h-2 w-2 rounded-full ${column.color}`} />
        <span className="text-xs font-medium">{column.label}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{tasks.length}</span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 min-h-[100px]">
          {tasks.map((task) => (
            <SortableKanbanCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableKanbanCard({ task }: { task: TeamTaskData }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard task={task} />
    </div>
  );
}

function KanbanCard({
  task,
  isDragging,
}: {
  task: TeamTaskData;
  isDragging?: boolean;
}) {
  return (
    <Card
      className={`p-2.5 cursor-grab active:cursor-grabbing ${isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-sm"}`}
    >
      <p className="text-sm font-medium line-clamp-2 mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Badge
            className={`text-[9px] px-1.5 py-0 ${priorityColors[task.priority] || ""}`}
          >
            {task.priority}
          </Badge>
          {task.assigneeName ? (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px]">
                {task.assigneeInitials}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
        {task.dueDate && (
          <span
            className={`text-[10px] ${isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
          >
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ─── Workload View ─── */
function WorkloadView({ tasks }: { tasks: WorkloadTask[] }) {
  // Group by team, then by assignee
  const teamData = useMemo(() => {
    const teams = new Map<
      string,
      {
        teamName: string;
        members: Map<
          string,
          {
            name: string;
            avatar: string | null;
            tasks: WorkloadTask[];
          }
        >;
        unassigned: WorkloadTask[];
      }
    >();

    tasks.forEach((t) => {
      const team = teams.get(t.teamId) || {
        teamName: t.teamName,
        members: new Map<string, { name: string; avatar: string | null; tasks: WorkloadTask[] }>(),
        unassigned: [] as WorkloadTask[],
      };

      if (!t.assigneeId) {
        team.unassigned.push(t);
      } else {
        const member = team.members.get(t.assigneeId) || {
          name: t.assigneeName || "Unknown",
          avatar: t.assigneeAvatar,
          tasks: [],
        };
        member.tasks.push(t);
        team.members.set(t.assigneeId, member);
      }

      teams.set(t.teamId, team);
    });

    return teams;
  }, [tasks]);

  // Charts data
  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((t) => counts.set(t.status, (counts.get(t.status) || 0) + 1));
    return Array.from(counts.entries()).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
      status,
    }));
  }, [tasks]);

  const teamChartData = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((t) =>
      counts.set(t.teamName, (counts.get(t.teamName) || 0) + 1)
    );
    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [tasks]);

  const STATUS_CHART_COLORS: Record<string, string> = {
    TODO: "#64748b",
    IN_PROGRESS: "#3b82f6",
    IN_REVIEW: "#8b5cf6",
    BLOCKED: "#ef4444",
    DONE: "#22c55e",
    ON_HOLD: "#6b7280",
  };

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_CHART_COLORS[entry.status] || "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tasks by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teamChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  opacity={0.5}
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Open Tasks"
                  radius={[4, 4, 0, 0]}
                >
                  {teamChartData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team-by-team workload */}
      {Array.from(teamData.entries()).map(([teamId, team]) => (
        <Card key={teamId}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {team.teamName}
              <Badge variant="secondary" className="text-[10px]">
                {Array.from(team.members.values()).reduce(
                  (s, m) => s + m.tasks.length,
                  0
                ) + team.unassigned.length}{" "}
                open
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(team.members.entries()).map(([userId, member]) => {
                const maxTasks = Math.max(
                  ...Array.from(teamData.values()).flatMap((t) =>
                    Array.from(t.members.values()).map((m) => m.tasks.length)
                  ),
                  1
                );
                const barWidth = (member.tasks.length / maxTasks) * 100;
                const overdue = member.tasks.filter(
                  (t) => t.dueDate && isOverdue(t.dueDate)
                ).length;
                const initials = member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div key={userId} className="flex items-center gap-3">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">
                          {member.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <span>{member.tasks.length} open</span>
                          {overdue > 0 && (
                            <span className="text-red-500">
                              {overdue} overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            overdue > 0
                              ? "bg-red-500"
                              : member.tasks.length > 5
                                ? "bg-orange-500"
                                : "bg-blue-500"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {team.unassigned.length > 0 && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-orange-100 text-orange-600">
                      ?
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-orange-600">
                        Unassigned
                      </span>
                      <span className="text-xs text-orange-500">
                        {team.unassigned.length} tasks
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {teamData.size === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No open tasks to show workload data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
