"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskBoard } from "./task-board";
import { TaskListView } from "./task-list-view";
import { TaskDetailModal } from "./task-detail-modal";
import { TaskFilters, type FilterState } from "./task-filters";
import { LayoutGrid, List } from "lucide-react";

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
  role: string;
  user: { id: string; name: string; email: string; avatar: string | null; role: string };
};

type Label = {
  id: string;
  name: string;
  color: string;
};

interface ProjectTaskViewsProps {
  projectId: string;
  tasks: Task[];
  members: Member[];
  labels: Label[];
}

export function ProjectTaskViews({
  projectId,
  tasks,
  members,
  labels,
}: ProjectTaskViewsProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    assignees: [],
    priorities: [],
    labels: [],
  });

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        filters.search &&
        !task.title.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.assignees.length > 0 &&
        (!task.assignee || !filters.assignees.includes(task.assignee.id))
      ) {
        return false;
      }
      if (
        filters.priorities.length > 0 &&
        !filters.priorities.includes(task.priority)
      ) {
        return false;
      }
      if (
        filters.labels.length > 0 &&
        !task.labels.some((l) => filters.labels.includes(l.id))
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const tasksByStatus = {
    TODO: filteredTasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: filteredTasks.filter((t) => t.status === "IN_PROGRESS"),
    IN_REVIEW: filteredTasks.filter((t) => t.status === "IN_REVIEW"),
    DONE: filteredTasks.filter((t) => t.status === "DONE"),
  };

  function handleTaskClick(taskId: string) {
    setSelectedTaskId(taskId);
    setModalOpen(true);
  }

  return (
    <>
      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        members={members}
        labels={labels}
      />

      <Tabs defaultValue="board" className="mt-4">
        <TabsList>
          <TabsTrigger value="board" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <TaskBoard
            projectId={projectId}
            tasksByStatus={tasksByStatus}
            onTaskClick={handleTaskClick}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <TaskListView
            projectId={projectId}
            tasks={filteredTasks}
            members={members}
            onTaskClick={handleTaskClick}
          />
        </TabsContent>
      </Tabs>

      <TaskDetailModal
        taskId={selectedTaskId}
        projectId={projectId}
        members={members}
        labels={labels}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
