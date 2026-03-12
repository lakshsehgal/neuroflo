"use client";

import { useState, useCallback } from "react";
import { createTask, updateTaskOrder } from "@/actions/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  GripVertical,
  Calendar,
  CheckCircle2,
  ListChecks,
  MessageSquare,
} from "lucide-react";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";
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
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: { id: string; name: string; avatar: string | null } | null;
  labels: { id: string; name: string; color: string }[];
  _count?: { subtasks: number; checklistItems: number; comments: number };
  subtasks?: { id: string; status: string }[];
  checklistItems?: { completed: boolean }[];
};

interface TaskBoardProps {
  projectId: string;
  tasksByStatus: Record<string, Task[]>;
  onTaskClick?: (taskId: string) => void;
}

const columns = [
  { key: "TODO", label: "To Do", color: "bg-gray-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { key: "IN_REVIEW", label: "In Review", color: "bg-yellow-500" },
  { key: "DONE", label: "Done", color: "bg-green-500" },
];

const priorityBorder: Record<string, string> = {
  LOW: "border-l-gray-300",
  MEDIUM: "border-l-blue-400",
  HIGH: "border-l-orange-400",
  URGENT: "border-l-red-500",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

// Droppable column wrapper
function DroppableColumn({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 space-y-2 min-h-[100px] rounded-lg p-1 transition-colors ${
        isOver ? "bg-primary/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

// Sortable task card
function SortableTaskCard({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick?: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onTaskClick={onTaskClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// Task card component
function TaskCard({
  task,
  onTaskClick,
  dragHandleProps,
  isOverlay,
}: {
  task: Task;
  onTaskClick?: (taskId: string) => void;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
}) {
  const doneSubtasks =
    task.subtasks?.filter((s) => s.status === "DONE").length ?? 0;
  const totalSubtasks = task._count?.subtasks ?? 0;
  const completedChecklist =
    task.checklistItems?.filter((c) => c.completed).length ?? 0;
  const totalChecklist = task._count?.checklistItems ?? 0;
  const totalComments = task._count?.comments ?? 0;

  return (
    <Card
      className={`cursor-pointer border-l-[3px] transition-shadow hover:shadow-md ${
        priorityBorder[task.priority] || "border-l-gray-300"
      } ${isOverlay ? "shadow-xl rotate-2" : ""}`}
      onClick={() => onTaskClick?.(task.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="mb-1.5 flex gap-1">
                {task.labels.slice(0, 3).map((l) => (
                  <span
                    key={l.id}
                    className="inline-block h-1.5 w-6 rounded-full"
                    style={{ backgroundColor: l.color }}
                    title={l.name}
                  />
                ))}
              </div>
            )}

            <p className="text-sm font-medium leading-snug">{task.title}</p>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                className={`${priorityColors[task.priority] || ""} text-[10px]`}
                variant="secondary"
              >
                {task.priority}
              </Badge>

              {task.dueDate && (
                <span
                  className={`flex items-center gap-0.5 text-[10px] ${
                    isOverdue(task.dueDate)
                      ? "font-medium text-red-600"
                      : isDueSoon(task.dueDate)
                      ? "text-orange-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>

            {/* Bottom row: progress indicators + assignee */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                {totalSubtasks > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    {doneSubtasks}/{totalSubtasks}
                  </span>
                )}
                {totalChecklist > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    <ListChecks className="h-3 w-3" />
                    {completedChecklist}/{totalChecklist}
                  </span>
                )}
                {totalComments > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    <MessageSquare className="h-3 w-3" />
                    {totalComments}
                  </span>
                )}
              </div>

              {task.assignee && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px]">
                    {task.assignee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskBoard({
  projectId,
  tasksByStatus,
  onTaskClick,
}: TaskBoardProps) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Local optimistic state
  const [localTasks, setLocalTasks] = useState<Record<string, Task[]> | null>(
    null
  );
  const currentTasks = localTasks || tasksByStatus;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Custom collision detection: prefer droppable columns over sortable items
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // First check if we're over a droppable column
      const rectCollisions = rectIntersection(args);
      const columnIds = columns.map((c) => c.key);
      const overColumn = rectCollisions.find((c) =>
        columnIds.includes(c.id as string)
      );
      if (overColumn) return [overColumn];

      // Fall back to closest center for sortable items
      const closestCollisions = closestCenter(args);
      if (closestCollisions.length > 0) return closestCollisions;

      return rectCollisions;
    },
    []
  );

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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const task = (active.data.current as { task: Task })?.task;
      if (task) setActiveTask(task);
      // Initialize local state from current
      if (!localTasks) setLocalTasks({ ...tasksByStatus });
    },
    [tasksByStatus, localTasks]
  );

  // Find which column a droppable/sortable ID belongs to
  const findColumn = useCallback(
    (id: string | number): string | null => {
      // Direct column match
      if (columns.find((c) => c.key === id)) return id as string;
      // Task inside a column
      const source = localTasks || tasksByStatus;
      for (const col of columns) {
        if (source[col.key]?.find((t) => t.id === id)) return col.key;
      }
      return null;
    },
    [localTasks, tasksByStatus]
  );

  const handleDragOver = useCallback(
    (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
      const { active, over } = event;
      if (!over) return;

      const activeCol = findColumn(active.id);
      const overCol = findColumn(over.id);
      if (!activeCol || !overCol || activeCol === overCol) return;

      // Move task between columns in local state
      const source = localTasks || tasksByStatus;
      const newTasks: Record<string, Task[]> = {};
      for (const col of columns) {
        newTasks[col.key] = [...(source[col.key] || [])];
      }
      const taskIndex = newTasks[activeCol].findIndex(
        (t) => t.id === active.id
      );
      if (taskIndex === -1) return;
      const [movedTask] = newTasks[activeCol].splice(taskIndex, 1);
      newTasks[overCol].push({ ...movedTask, status: overCol });
      setLocalTasks(newTasks);
    },
    [findColumn, localTasks, tasksByStatus]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) {
        setLocalTasks(null);
        return;
      }

      const source = localTasks || tasksByStatus;
      const targetCol = findColumn(over.id);
      if (!targetCol) {
        setLocalTasks(null);
        return;
      }

      // Build order updates for server from current local state
      const updates: { id: string; status: string; order: number }[] = [];
      for (const col of columns) {
        (source[col.key] || []).forEach((task, index) => {
          updates.push({ id: task.id, status: col.key, order: index });
        });
      }

      try {
        await updateTaskOrder(updates);
      } catch {
        // Revert on error
      }
      setLocalTasks(null);
    },
    [localTasks, tasksByStatus, findColumn]
  );

  const totalTasks = Object.values(currentTasks).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column, colIdx) => {
          const tasks = currentTasks[column.key] || [];
          const taskIds = tasks.map((t) => t.id);

          return (
            <motion.div
              key={column.key}
              className="flex flex-col"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIdx * 0.08, duration: 0.3 }}
            >
              {/* Column header with colored top stripe */}
              <div className="mb-3 overflow-hidden rounded-lg">
                <div className={`h-1 ${column.color}`} />
                <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                  <h3 className="text-sm font-semibold">{column.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {tasks.length}
                  </Badge>
                </div>
              </div>

              <DroppableColumn id={column.key}>
                <SortableContext
                  items={taskIds}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence mode="popLayout">
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          },
                          opacity: { duration: 0.2 },
                        }}
                      >
                        <SortableTaskCard
                          task={task}
                          onTaskClick={onTaskClick}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SortableContext>

                {/* Add task */}
                <AnimatePresence mode="wait">
                  {addingTo === column.key ? (
                    <motion.div
                      key="add-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2 overflow-hidden"
                    >
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
                        <Button
                          size="sm"
                          onClick={() => handleAddTask(column.key)}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAddingTo(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="add-button">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setAddingTo(column.key)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add task
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DroppableColumn>
            </motion.div>
          );
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="w-64">
            <TaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
