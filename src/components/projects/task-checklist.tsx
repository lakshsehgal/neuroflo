"use client";

import { useState, useTransition } from "react";
import { createChecklistItem, toggleChecklistItem, deleteChecklistItem } from "@/actions/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";

type ChecklistItemData = {
  id: string;
  title: string;
  completed: boolean;
  order: number;
};

interface TaskChecklistProps {
  taskId: string;
  items: ChecklistItemData[];
}

export function TaskChecklist({ taskId, items }: TaskChecklistProps) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  function handleAdd() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await createChecklistItem(taskId, newTitle.trim());
      setNewTitle("");
    });
  }

  function handleToggle(id: string, completed: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(id, !completed);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteChecklistItem(id);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Checklist</h4>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{items.length}
        </span>
      </div>

      {items.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
          >
            <button
              onClick={() => handleToggle(item.id, item.completed)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              disabled={isPending}
            >
              {item.completed ? (
                <CheckSquare className="h-4 w-4 text-green-600" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                item.completed ? "text-muted-foreground line-through" : ""
              }`}
            >
              {item.title}
            </span>
            <button
              onClick={() => handleDelete(item.id)}
              className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex gap-2">
          <Input
            placeholder="Add item..."
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
          Add item
        </Button>
      )}
    </div>
  );
}
