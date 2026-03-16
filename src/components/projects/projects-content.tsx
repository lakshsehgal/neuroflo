"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Project = {
  id: string;
  name: string;
  description: string | null;
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
                        <CardTitle className="text-base">
                          {project.name}
                        </CardTitle>
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
