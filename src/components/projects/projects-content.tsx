"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverCard,
} from "@/components/motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  RESEARCH: "bg-purple-100 text-purple-800",
  MOODBOARDING: "bg-pink-100 text-pink-800",
  ANGLES: "bg-indigo-100 text-indigo-800",
  SCRIPTING: "bg-yellow-100 text-yellow-800",
  APPROVAL_PENDING: "bg-amber-100 text-amber-800",
  CREATOR_FINALISING: "bg-cyan-100 text-cyan-800",
  PRODUCTION: "bg-green-100 text-green-800",
  POST_PRODUCTION: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-gray-100 text-gray-800",
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  endDate: string | null;
  clientName: string | null;
  taskCount: number;
  memberCount: number;
};

export function ProjectsContent({ projects }: { projects: Project[] }) {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">Manage your agency projects</p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No projects yet. Create your first project.
              </p>
            </CardContent>
          </Card>
        ) : (
          <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <StaggerItem key={project.id}>
                <Link href={`/projects/${project.id}`}>
                  <HoverCard>
                    <Card className="h-full transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">
                            {project.name}
                          </CardTitle>
                          <Badge
                            className={statusColors[project.status] || ""}
                            variant="secondary"
                          >
                            {project.status.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        {project.clientName && (
                          <p className="text-xs text-muted-foreground">
                            {project.clientName}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {project.description && (
                          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{project.taskCount} tasks</span>
                          <span>{project.memberCount} members</span>
                          {project.endDate && (
                            <span>
                              Due {formatDate(new Date(project.endDate))}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCard>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
