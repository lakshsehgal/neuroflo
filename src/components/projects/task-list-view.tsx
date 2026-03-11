"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedTableBody, AnimatedRow } from "@/components/motion";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import {
  ArrowUpDown,
  Plus,
  CheckCircle2,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { createTask } from "@/actions/tasks";

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

interface TaskListViewProps {
  projectId: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const statusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  DONE: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

type SortKey = "title" | "status" | "priority" | "dueDate";

export function TaskListView({ projectId, tasks, onTaskClick }: TaskListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const statusOrder = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3 };

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
              (s) => s.status === "DONE"
            ).length;
            const completedChecklist = task.checklistItems.filter(
              (c) => c.completed
            ).length;

            return (
              <AnimatedRow
                key={task.id}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                onClick={() => onTaskClick(task.id)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{task.title}</span>
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
                  <Badge
                    className={`${statusColors[task.status] || ""} text-xs`}
                    variant="secondary"
                  >
                    {statusLabels[task.status] || task.status}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    className={`${priorityColors[task.priority] || ""} text-xs`}
                    variant="secondary"
                  >
                    {task.priority}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px]">
                          {task.assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {task.assignee.name.split(" ")[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
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
                <td className="px-3 py-2.5">
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
