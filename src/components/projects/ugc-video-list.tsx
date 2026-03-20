"use client";

import { useState } from "react";
import { createTask } from "@/actions/tasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Calendar,
  Video,
  AtSign,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { formatDate, isOverdue, isDueSoon } from "@/lib/utils";

type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  creatorName: string | null;
  creatorHandle: string | null;
  shootDate: string | null;
  videoUrl: string | null;
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

const statusLabels: Record<string, string> = {
  RESEARCH: "Research",
  MOODBOARDING: "Moodboard",
  ANGLES: "Angles",
  SCRIPTING: "Scripting",
  APPROVAL_PENDING: "Approval",
  CREATOR_FINALISING: "Creator Finalising",
  PRODUCTION: "Shooting",
  POST_PRODUCTION: "Editing",
  DELIVERED: "Delivered",
  ON_HOLD: "On Hold",
};

const statusColors: Record<string, string> = {
  RESEARCH: "bg-purple-100 text-purple-700",
  MOODBOARDING: "bg-pink-100 text-pink-700",
  ANGLES: "bg-indigo-100 text-indigo-700",
  SCRIPTING: "bg-yellow-100 text-yellow-700",
  APPROVAL_PENDING: "bg-amber-100 text-amber-700",
  CREATOR_FINALISING: "bg-cyan-100 text-cyan-700",
  PRODUCTION: "bg-green-100 text-green-700",
  POST_PRODUCTION: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  ON_HOLD: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

interface UGCVideoListProps {
  projectId: string;
  videos: VideoItem[];
  members: Member[];
  onVideoClick: (videoId: string) => void;
}

export function UGCVideoList({
  projectId,
  videos,
  members,
  onVideoClick,
}: UGCVideoListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    await createTask({ projectId, title: newTitle });
    setNewTitle("");
    setShowAddForm(false);
    setAdding(false);
  }

  // Group by creator
  const byCreator = new Map<string, VideoItem[]>();
  const noCreator: VideoItem[] = [];
  for (const video of videos) {
    if (video.creatorName) {
      const existing = byCreator.get(video.creatorName) || [];
      existing.push(video);
      byCreator.set(video.creatorName, existing);
    } else {
      noCreator.push(video);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex justify-end">
        {showAddForm ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Video title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setShowAddForm(false);
              }}
              autoFocus
              className="w-64"
            />
            <Button size="sm" onClick={handleAdd} disabled={adding}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </Button>
        )}
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_140px_120px_120px_100px_80px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>Video</span>
        <span>Creator</span>
        <span>Shoot Date</span>
        <span>Stage</span>
        <span>Due Date</span>
        <span>Assignee</span>
      </div>

      {/* Videos list */}
      <div className="space-y-1.5">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="cursor-pointer transition-all hover:shadow-sm hover:border-primary/20"
            onClick={() => onVideoClick(video.id)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="md:grid grid-cols-[1fr_140px_120px_120px_100px_80px] gap-3 items-center">
                {/* Title & info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {video.title}
                      </p>
                      <Badge
                        className={`${priorityColors[video.priority]} text-[10px] shrink-0`}
                        variant="secondary"
                      >
                        {video.priority}
                      </Badge>
                      {video.videoUrl && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {video.labels.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {video.labels.slice(0, 3).map((l) => (
                          <span
                            key={l.id}
                            className="inline-block h-1.5 w-6 rounded-full"
                            style={{ backgroundColor: l.color }}
                            title={l.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Creator */}
                <div className="hidden md:block">
                  {video.creatorName ? (
                    <div className="flex items-center gap-1">
                      <AtSign className="h-3 w-3 text-violet-500" />
                      <span className="text-xs font-medium text-violet-700 truncate">
                        {video.creatorName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                  {video.creatorHandle && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {video.creatorHandle}
                    </p>
                  )}
                </div>

                {/* Shoot date */}
                <div className="hidden md:block">
                  {video.shootDate ? (
                    <div className="flex items-center gap-1">
                      <Video className="h-3 w-3 text-cyan-500" />
                      <span className="text-xs">
                        {formatDate(new Date(video.shootDate))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>

                {/* Stage */}
                <div className="hidden md:block">
                  <Badge
                    variant="secondary"
                    className={`${statusColors[video.status]} text-[10px]`}
                  >
                    {statusLabels[video.status] || video.status}
                  </Badge>
                </div>

                {/* Due date */}
                <div className="hidden md:block">
                  {video.dueDate ? (
                    <span
                      className={`flex items-center gap-1 text-xs ${
                        isOverdue(video.dueDate)
                          ? "font-medium text-red-600"
                          : isDueSoon(video.dueDate)
                          ? "text-orange-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDate(new Date(video.dueDate))}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>

                {/* Assignee */}
                <div className="hidden md:flex justify-center">
                  {video.assignee ? (
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {video.assignee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              {/* Mobile-only meta */}
              <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                <Badge
                  variant="secondary"
                  className={`${statusColors[video.status]} text-[10px]`}
                >
                  {statusLabels[video.status] || video.status}
                </Badge>
                {video.creatorName && (
                  <span className="text-xs text-violet-700">
                    @{video.creatorName}
                  </span>
                )}
                {video.shootDate && (
                  <span className="text-xs text-muted-foreground">
                    Shoot: {formatDate(new Date(video.shootDate))}
                  </span>
                )}
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {videos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No UGC videos yet. Add your first video to start tracking.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
