"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { UGCVideoBoard } from "./ugc-video-board";
import { UGCVideoList } from "./ugc-video-list";
import { ProjectSettings } from "./project-settings";
import { GuestAccessPanel } from "./guest-access-panel";
import { TaskDetailModal } from "./task-detail-modal";
import { TaskFilters, type FilterState } from "./task-filters";
import {
  LayoutGrid,
  List,
  Settings,
  Share2,
  Film,
  Video,
  CheckCircle2,
  Users,
} from "lucide-react";

type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  creatorName: string | null;
  workPortfolioLink: string | null;
  shootDate: string | null;
  deliveryLink: string | null;
  thumbnailUrl: string | null;
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

type GuestAccessItem = {
  id: string;
  token: string;
  email: string | null;
  name: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

interface UGCProjectDetailProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    clientId: string | null;
    clientName: string | null;
    departmentId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  videos: VideoItem[];
  members: Member[];
  labels: Label[];
  guestAccess: GuestAccessItem[];
  currentUserId: string;
  currentUserRole: string;
}

export function UGCProjectDetail({
  project,
  videos,
  members,
  labels,
  guestAccess,
  currentUserId,
  currentUserRole,
}: UGCProjectDetailProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    assignees: [],
    priorities: [],
    labels: [],
    dueDate: "all",
    dueDateFrom: "",
    dueDateTo: "",
  });

  // Stats
  const totalVideos = videos.length;
  const delivered = videos.filter((v) => v.status === "DELIVERED").length;
  const inProduction = videos.filter(
    (v) => v.status === "PRODUCTION" || v.status === "POST_PRODUCTION"
  ).length;
  const uniqueCreators = new Set(
    videos.filter((v) => v.creatorName).map((v) => v.creatorName)
  ).size;

  // Apply filters
  const filteredVideos = videos.filter((video) => {
    if (
      filters.search &&
      !video.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !(video.creatorName || "").toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.assignees.length > 0 &&
      (!video.assignee || !filters.assignees.includes(video.assignee.id))
    ) {
      return false;
    }
    if (
      filters.priorities.length > 0 &&
      !filters.priorities.includes(video.priority)
    ) {
      return false;
    }
    if (
      filters.labels.length > 0 &&
      !video.labels.some((l) => filters.labels.includes(l.id))
    ) {
      return false;
    }
    return true;
  });

  // Convert for task board (needs Date objects)
  const tasksForBoard = filteredVideos.map((v) => ({
    ...v,
    dueDate: v.dueDate ? new Date(v.dueDate) : null,
    shootDate: v.shootDate ? new Date(v.shootDate) : null,
  }));

  const tasksByStatus: Record<string, typeof tasksForBoard> = {};
  const statuses = [
    "RESEARCH", "MOODBOARDING", "ANGLES", "SCRIPTING",
    "APPROVAL_PENDING", "CREATOR_FINALISING", "PRODUCTION",
    "POST_PRODUCTION", "IN_REVISION", "DELIVERED", "ON_HOLD",
  ];
  for (const s of statuses) {
    tasksByStatus[s] = tasksForBoard.filter((t) => t.status === s);
  }

  function handleVideoClick(taskId: string) {
    setSelectedTaskId(taskId);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Film className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge
                variant="secondary"
                className={
                  project.status === "CLOSED"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-green-100 text-green-700"
                }
              >
                {project.status === "CLOSED" ? "Closed" : "Active"}
              </Badge>
            </div>
            {project.clientName && (
              <p className="text-sm text-muted-foreground">
                Client: {project.clientName}
              </p>
            )}
          </div>
        </div>
        {project.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Video className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium">{totalVideos}</span>
          <span className="text-xs text-muted-foreground">Videos</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium">{delivered}</span>
          <span className="text-xs text-muted-foreground">Delivered</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Film className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">{inProduction}</span>
          <span className="text-xs text-muted-foreground">In Production</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <Users className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium">{uniqueCreators}</span>
          <span className="text-xs text-muted-foreground">Creators</span>
        </div>

        {/* Date range */}
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          {project.startDate && (
            <span>Start: {formatDate(new Date(project.startDate))}</span>
          )}
          {project.endDate && (
            <span>Due: {formatDate(new Date(project.endDate))}</span>
          )}
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <Avatar
                key={m.userId}
                className="h-6 w-6 border-2 border-background"
              >
                <AvatarFallback className="text-[10px]">
                  {m.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            List
          </TabsTrigger>
          <TabsTrigger value="sharing" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            Client Access
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-4">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            members={members}
            labels={labels}
          />
          <div className="mt-4">
            <UGCVideoBoard
              projectId={project.id}
              tasksByStatus={tasksByStatus}
              onTaskClick={handleVideoClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            members={members}
            labels={labels}
          />
          <div className="mt-4">
            <UGCVideoList
              projectId={project.id}
              videos={filteredVideos}
              members={members}
              onVideoClick={handleVideoClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="sharing" className="mt-4">
          <GuestAccessPanel
            projectId={project.id}
            guestAccess={guestAccess}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <ProjectSettings
            projectId={project.id}
            projectName={project.name}
            projectDescription={project.description}
            projectStatus={project.status}
            projectClientId={project.clientId}
            projectDepartmentId={project.departmentId}
            projectStartDate={project.startDate}
            projectEndDate={project.endDate}
            members={members}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </TabsContent>
      </Tabs>

      <TaskDetailModal
        taskId={selectedTaskId}
        projectId={project.id}
        members={members}
        labels={labels}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onTaskDeleted={() => window.location.reload()}
      />
    </div>
  );
}
