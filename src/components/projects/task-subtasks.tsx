"use client";

import { useState, useTransition } from "react";
import { createSubtask, updateTask } from "@/actions/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Circle, CheckCircle2 } from "lucide-react";

type SubtaskData = {
  id: string;
  title: string;
  status: string;
  assignee: { id: string; name: string; avatar: string | null } | null;
};

interface TaskSubtasksProps {
  taskId: string;
  projectId: string;
  subtasks: SubtaskData[];
}

const statusIcon: Record<string, React.ReactNode> = {
  TODO: <Circle className="h-3.5 w-3.5 text-gray-400" />,
  IN_PROGRESS: <Circle className="h-3.5 w-3.5 text-blue-500" />,
  IN_REVIEW: <Circle className="h-3.5 w-3.5 text-yellow-500" />,
  DONE: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
};

export function TaskSubtasks({ taskId, projectId, subtasks }: TaskSubtasksProps) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const doneCount = subtasks.filter((s) => s.status === "DONE").length;

  function handleAdd() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await createSubtask(taskId, projectId, newTitle.trim());
      setNewTitle("");
    });
  }

  function handleToggle(subtask: SubtaskData) {
    const newStatus = subtask.status === "DONE" ? "TODO" : "DONE";
    startTransition(async () => {
      await updateTask(subtask.id, { projectId, status: newStatus });
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Subtasks</h4>
        {subtasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {doneCount}/{subtasks.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
          >
            <button
              onClick={() => handleToggle(subtask)}
              className="shrink-0"
              disabled={isPending}
            >
              {statusIcon[subtask.status] || statusIcon.TODO}
            </button>
            <span
              className={`flex-1 text-sm ${
                subtask.status === "DONE" ? "text-muted-foreground line-through" : ""
              }`}
            >
              {subtask.title}
            </span>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Input
            placeholder="Subtask title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            autoFocus
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={isPending}>
            Add
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setAdding(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add subtask
        </Button>
      )}
    </div>
  );
}
