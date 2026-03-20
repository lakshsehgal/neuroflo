"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion";
import {
  Plus,
  Video,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Film,
} from "lucide-react";
import Link from "next/link";

type VideoSummary = {
  id: string;
  status: string;
  creatorName: string | null;
  shootDate: string | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  clientName: string | null;
  startDate: string | null;
  endDate: string | null;
  videos: VideoSummary[];
  memberCount: number;
  members: { name: string; avatar: string | null }[];
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

function getVideoStats(videos: VideoSummary[]) {
  const total = videos.length;
  const delivered = videos.filter((v) => v.status === "DELIVERED").length;
  const inProduction = videos.filter(
    (v) => v.status === "PRODUCTION" || v.status === "POST_PRODUCTION"
  ).length;
  const preProduction = videos.filter(
    (v) =>
      !["PRODUCTION", "POST_PRODUCTION", "DELIVERED", "ON_HOLD"].includes(
        v.status
      )
  ).length;
  const uniqueCreators = new Set(
    videos.filter((v) => v.creatorName).map((v) => v.creatorName)
  ).size;
  return { total, delivered, inProduction, preProduction, uniqueCreators };
}

function StageProgressBar({ videos }: { videos: VideoSummary[] }) {
  const total = videos.length;
  if (total === 0) return null;

  const delivered = videos.filter((v) => v.status === "DELIVERED").length;
  const production = videos.filter(
    (v) => v.status === "PRODUCTION" || v.status === "POST_PRODUCTION"
  ).length;
  const preProduction = total - delivered - production;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {delivered > 0 && (
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${(delivered / total) * 100}%` }}
        />
      )}
      {production > 0 && (
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${(production / total) * 100}%` }}
        />
      )}
      {preProduction > 0 && (
        <div
          className="bg-purple-400 transition-all"
          style={{ width: `${(preProduction / total) * 100}%` }}
        />
      )}
    </div>
  );
}

export function ProjectsContent({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter((p) => p.status !== "CLOSED");
  const closedProjects = projects.filter((p) => p.status === "CLOSED");

  // Totals across all projects
  const allVideos = projects.flatMap((p) => p.videos);
  const totalVideos = allVideos.length;
  const totalDelivered = allVideos.filter(
    (v) => v.status === "DELIVERED"
  ).length;
  const totalInProduction = allVideos.filter(
    (v) => v.status === "PRODUCTION" || v.status === "POST_PRODUCTION"
  ).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">UGC Projects</h1>
            <p className="text-muted-foreground">
              Manage your UGC video projects & creator collaborations
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Overview Stats */}
        {totalVideos > 0 && (
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
                  <p className="text-2xl font-bold">{totalInProduction}</p>
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
                  <p className="text-2xl font-bold">{totalDelivered}</p>
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
                  <p className="text-2xl font-bold">{activeProjects.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Active Projects
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Projects */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No UGC projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first project to start tracking UGC videos
              </p>
              <Button asChild className="mt-4">
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeProjects.length > 0 && (
              <StaggerContainer className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeProjects.map((project) => {
                  const stats = getVideoStats(project.videos);
                  return (
                    <StaggerItem key={project.id}>
                      <Link href={`/projects/${project.id}`}>
                        <Card className="group h-full transition-all hover:shadow-md hover:border-primary/20">
                          <CardContent className="p-5">
                            {/* Project header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                                  {project.name}
                                </h3>
                                {project.clientName && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {project.clientName}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 text-[10px] shrink-0"
                              >
                                Active
                              </Badge>
                            </div>

                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {project.description}
                              </p>
                            )}

                            {/* Progress bar */}
                            <StageProgressBar videos={project.videos} />

                            {/* Video stats */}
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                                <p className="text-sm font-semibold">
                                  {stats.total}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Videos
                                </p>
                              </div>
                              <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                                <p className="text-sm font-semibold text-emerald-600">
                                  {stats.delivered}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Delivered
                                </p>
                              </div>
                              <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
                                <p className="text-sm font-semibold text-blue-600">
                                  {stats.inProduction}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  In Production
                                </p>
                              </div>
                            </div>

                            {/* Footer: creators & team */}
                            <div className="mt-3 flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                <span>
                                  {stats.uniqueCreators > 0
                                    ? `${stats.uniqueCreators} creator${stats.uniqueCreators !== 1 ? "s" : ""}`
                                    : "No creators"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1.5">
                                  {project.members.slice(0, 3).map((m, i) => (
                                    <Avatar
                                      key={i}
                                      className="h-5 w-5 border-2 border-background"
                                    >
                                      <AvatarFallback className="text-[8px]">
                                        {m.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                {project.memberCount > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{project.memberCount - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}

            {/* Closed Projects */}
            {closedProjects.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Closed Projects ({closedProjects.length})
                </h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {closedProjects.map((project) => {
                    const stats = getVideoStats(project.videos);
                    return (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                      >
                        <Card className="opacity-60 hover:opacity-80 transition-opacity">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <h3 className="font-medium text-sm truncate">
                                  {project.name}
                                </h3>
                                {project.clientName && (
                                  <p className="text-xs text-muted-foreground">
                                    {project.clientName}
                                  </p>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                Closed
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {stats.total} videos &middot; {stats.delivered}{" "}
                              delivered
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
