"use client";

import { useState } from "react";
import { createTask, updateTask } from "@/actions/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: { id: string; name: string; avatar: string | null } | null;
  labels: { id: string; name: string; color: string }[];
};

interface TaskBoardProps {
  projectId: string;
  tasksByStatus: Record<string, Task[]>;
}

const columns = [
  { key: "TODO", label: "To Do", color: "bg-gray-100" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100" },
  { key: "IN_REVIEW", label: "In Review", color: "bg-yellow-100" },
  { key: "DONE", label: "Done", color: "bg-green-100" },
];

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export function TaskBoard({ projectId, tasksByStatus }: TaskBoardProps) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  async function handleAddTask(status: string) {
    if (!newTaskTitle.trim()) return;

    await createTask({
      projectId,
      title: newTaskTitle,
      status: status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
    });

    setNewTaskTitle("");
    setAddingTo(null);
  }

  async function handleMoveTask(taskId: string, newStatus: string) {
    await updateTask(taskId, {
      projectId,
      status: newStatus as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map((column) => (
        <div key={column.key} className="flex flex-col">
          <div className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${column.color}`}>
            <h3 className="text-sm font-semibold">{column.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {tasksByStatus[column.key]?.length || 0}
            </Badge>
          </div>

          <div className="flex-1 space-y-2">
            {tasksByStatus[column.key]?.map((task) => (
              <Card key={task.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className={priorityColors[task.priority] || ""} variant="secondary">
                          {task.priority}
                        </Badge>
                        {task.assignee && (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px]">
                              {task.assignee.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      {/* Quick move buttons */}
                      <div className="mt-2 flex gap-1">
                        {columns
                          .filter((c) => c.key !== column.key)
                          .map((c) => (
                            <button
                              key={c.key}
                              onClick={() => handleMoveTask(task.id, c.key)}
                              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
                              title={`Move to ${c.label}`}
                            >
                              {c.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add task */}
            {addingTo === column.key ? (
              <div className="space-y-2">
                <Input
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTask(column.key);
                    if (e.key === "Escape") setAddingTo(null);
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAddTask(column.key)}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingTo(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setAddingTo(column.key)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
