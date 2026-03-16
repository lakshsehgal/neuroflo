"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedTableBody, AnimatedRow } from "@/components/motion";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import {
  ArrowUpDown,
  Plus,
  CheckCircle2,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { createTask, updateTask } from "@/actions/tasks";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: { id: string; name: string; avatar: string | null } | null;
  labels: { id: string; name: string; color: string }[];
  _count: { subtasks: number; checklistItems: number; comments: number };
  subtasks: { id: string; status: string }[];
  checklistItems: { completed: boolean }[];
};

type Member = {
  userId: string;
  user: { id: string; name: string; avatar: string | null };
};

interface TaskListViewProps {
  projectId: string;
  tasks: Task[];
  members?: Member[];
  onTaskClick: (taskId: string) => void;
}

const statusColors: Record<string, string> = {
  RESEARCH: "bg-purple-100 text-purple-800",
  MOODBOARDING: "bg-pink-100 text-pink-800",
  ANGLES: "bg-indigo-100 text-indigo-800",
  SCRIPTING: "bg-yellow-100 text-yellow-800",
  APPROVAL_PENDING: "bg-amber-100 text-amber-800",
  CREATOR_FINALISING: "bg-cyan-100 text-cyan-800",
  PRODUCTION: "bg-green-100 text-green-800",
  POST_PRODUCTION: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  RESEARCH: "Research",
  MOODBOARDING: "Moodboarding",
  ANGLES: "Angles",
  SCRIPTING: "Scripting",
  APPROVAL_PENDING: "Approval Pending",
  CREATOR_FINALISING: "Creator Finalising",
  PRODUCTION: "Production",
  POST_PRODUCTION: "Post Production",
  DELIVERED: "Delivered",
  ON_HOLD: "On Hold",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

type SortKey = "title" | "status" | "priority" | "dueDate";

export function TaskListView({ projectId, tasks, members, onTaskClick }: TaskListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const statusOrder: Record<string, number> = { RESEARCH: 0, MOODBOARDING: 1, ANGLES: 2, SCRIPTING: 3, APPROVAL_PENDING: 4, CREATOR_FINALISING: 5, PRODUCTION: 6, POST_PRODUCTION: 7, DELIVERED: 8, ON_HOLD: 9 };

  const sortedTasks = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp =
          (statusOrder[a.status as keyof typeof statusOrder] ?? 0) -
          (statusOrder[b.status as keyof typeof statusOrder] ?? 0);
        break;
      case "priority":
        cmp =
          (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 0) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 0);
        break;
      case "dueDate":
        cmp =
          (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
          (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    await createTask({ projectId, title: newTaskTitle });
    setNewTaskTitle("");
    setAddingTask(false);
  }

  function handleInlineUpdate(taskId: string, field: string, value: string) {
    startTransition(async () => {
      await updateTask(taskId, { projectId, [field]: value || undefined });
    });
  }

  function SortButton({ label, field }: { label: string; field: SortKey }) {
    return (
      <button
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => handleSort(field)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2.5 text-left">
              <SortButton label="Task" field="title" />
            </th>
            <th className="px-3 py-2.5 text-left">
              <SortButton label="Status" field="status" />
            </th>
            <th className="px-3 py-2.5 text-left">
              <SortButton label="Priority" field="priority" />
            </th>
            <th className="px-3 py-2.5 text-left">
              <span className="text-xs font-medium text-muted-foreground">Assignee</span>
            </th>
            <th className="px-3 py-2.5 text-left">
              <SortButton label="Due Date" field="dueDate" />
            </th>
            <th className="px-3 py-2.5 text-left">
              <span className="text-xs font-medium text-muted-foreground">Info</span>
            </th>
          </tr>
        </thead>
        <AnimatedTableBody>
          {sortedTasks.map((task) => {
            const doneSubtasks = task.subtasks.filter(
              (s) => s.status === "DELIVERED"
            ).length;
            const completedChecklist = task.checklistItems.filter(
              (c) => c.completed
            ).length;

            return (
              <AnimatedRow
                key={task.id}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-2.5" onClick={() => onTaskClick(task.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium hover:text-primary transition-colors">{task.title}</span>
                    {task.labels.slice(0, 2).map((l) => (
                      <span
                        key={l.id}
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                        title={l.name}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Select value={task.status} onValueChange={(v) => handleInlineUpdate(task.id, "status", v)}>
                    <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1.5 focus:ring-0 focus:ring-offset-0">
                      <Badge
                        className={`${statusColors[task.status] || ""} text-xs`}
                        variant="secondary"
                      >
                        {statusLabels[task.status] || task.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <Badge className={`${statusColors[key]} text-xs`} variant="secondary">{label}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2.5">
                  <Select value={task.priority} onValueChange={(v) => handleInlineUpdate(task.id, "priority", v)}>
                    <SelectTrigger className="h-7 w-[90px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1.5 focus:ring-0 focus:ring-offset-0">
                      <Badge
                        className={`${priorityColors[task.priority] || ""} text-xs`}
                        variant="secondary"
                      >
                        {task.priority}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>
                          <Badge className={`${priorityColors[p]} text-xs`} variant="secondary">{p}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2.5">
                  {members ? (
                    <Select
                      value={task.assignee?.id || "unassigned"}
                      onValueChange={(v) => handleInlineUpdate(task.id, "assigneeId", v === "unassigned" ? "" : v)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1.5 focus:ring-0 focus:ring-offset-0">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px]">
                                {task.assignee.name.split(" ").map((n) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {task.assignee.name.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div onClick={() => onTaskClick(task.id)}>
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px]">
                              {task.assignee.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {task.assignee.name.split(" ")[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5" onClick={() => onTaskClick(task.id)}>
                  {task.dueDate ? (
                    <span
                      className={`text-xs ${
                        isOverdue(task.dueDate)
                          ? "font-medium text-red-600"
                          : isDueSoon(task.dueDate)
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5" onClick={() => onTaskClick(task.id)}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {task._count.subtasks > 0 && (
                      <span className="flex items-center gap-0.5 text-xs" title="Subtasks">
                        <CheckCircle2 className="h-3 w-3" />
                        {doneSubtasks}/{task._count.subtasks}
                      </span>
                    )}
                    {task._count.checklistItems > 0 && (
                      <span className="flex items-center gap-0.5 text-xs" title="Checklist">
                        <ListChecks className="h-3 w-3" />
                        {completedChecklist}/{task._count.checklistItems}
                      </span>
                    )}
                    {task._count.comments > 0 && (
                      <span className="flex items-center gap-0.5 text-xs" title="Comments">
                        <MessageSquare className="h-3 w-3" />
                        {task._count.comments}
                      </span>
                    )}
                  </div>
                </td>
              </AnimatedRow>
            );
          })}
        </AnimatedTableBody>
      </table>

      {/* Quick add */}
      <div className="border-t px-4 py-2">
        {addingTask ? (
          <div className="flex gap-2">
            <Input
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") setAddingTask(false);
              }}
              autoFocus
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={handleAddTask}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingTask(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setAddingTask(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add task
          </Button>
        )}
      </div>
    </div>
  );
}
