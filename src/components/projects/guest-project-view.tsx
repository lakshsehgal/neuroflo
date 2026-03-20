"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  Video,
  CheckCircle2,
  Calendar,
  AtSign,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type GuestVideo = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  creatorName: string | null;
  creatorHandle: string | null;
  shootDate: string | null;
  dueDate: string | null;
  videoUrl: string | null;
  assigneeName: string | null;
};

const statusLabels: Record<string, string> = {
  RESEARCH: "Research",
  MOODBOARDING: "Moodboard",
  ANGLES: "Angles",
  SCRIPTING: "Scripting",
  APPROVAL_PENDING: "Awaiting Approval",
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

// Ordered stages for the pipeline view
const stageOrder = [
  "RESEARCH",
  "MOODBOARDING",
  "ANGLES",
  "SCRIPTING",
  "APPROVAL_PENDING",
  "CREATOR_FINALISING",
  "PRODUCTION",
  "POST_PRODUCTION",
  "DELIVERED",
];

function getStageIndex(status: string): number {
  const idx = stageOrder.indexOf(status);
  return idx === -1 ? -1 : idx;
}

interface GuestProjectViewProps {
  project: {
    name: string;
    clientName: string | null;
  };
  videos: GuestVideo[];
  guestName: string | null;
}

export function GuestProjectView({
  project,
  videos,
  guestName,
}: GuestProjectViewProps) {
  const totalVideos = videos.length;
  const delivered = videos.filter((v) => v.status === "DELIVERED").length;
  const inProduction = videos.filter(
    (v) => v.status === "PRODUCTION" || v.status === "POST_PRODUCTION"
  ).length;
  const onHold = videos.filter((v) => v.status === "ON_HOLD").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Film className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.clientName && `${project.clientName} · `}
                {guestName ? `Welcome, ${guestName}` : "Guest View"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-100 p-2">
                <Film className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalVideos}</p>
                <p className="text-xs text-muted-foreground">Total Videos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2">
                <Video className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProduction}</p>
                <p className="text-xs text-muted-foreground">In Production</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-100 p-2">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onHold}</p>
                <p className="text-xs text-muted-foreground">On Hold</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Videos */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            UGC Videos
          </h2>

          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No videos have been added to this project yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => {
                const stageIdx = getStageIndex(video.status);
                const totalStages = stageOrder.length;

                return (
                  <Card key={video.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{video.title}</h3>
                          {video.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {video.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${statusColors[video.status]} text-xs shrink-0`}
                        >
                          {statusLabels[video.status] || video.status}
                        </Badge>
                      </div>

                      {/* Stage progress pipeline */}
                      {video.status !== "ON_HOLD" && stageIdx >= 0 && (
                        <div className="mb-3">
                          <div className="flex gap-0.5">
                            {stageOrder.map((stage, i) => (
                              <div
                                key={stage}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  i <= stageIdx
                                    ? i === totalStages - 1
                                      ? "bg-emerald-500"
                                      : "bg-primary"
                                    : "bg-muted"
                                }`}
                                title={statusLabels[stage]}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Stage {stageIdx + 1} of {totalStages}
                          </p>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {video.creatorName && (
                          <span className="flex items-center gap-1">
                            <AtSign className="h-3 w-3 text-violet-500" />
                            <span className="font-medium text-violet-700">
                              {video.creatorName}
                            </span>
                            {video.creatorHandle && (
                              <span>({video.creatorHandle})</span>
                            )}
                          </span>
                        )}
                        {video.shootDate && (
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3 text-cyan-500" />
                            Shoot: {formatDate(new Date(video.shootDate))}
                          </span>
                        )}
                        {video.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {formatDate(new Date(video.dueDate))}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by NeuroFlo
          </p>
        </div>
      </div>
    </div>
  );
}
