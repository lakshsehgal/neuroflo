import { getProject } from "@/actions/projects";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectTaskViews } from "@/components/projects/project-task-views";
import { Settings } from "lucide-react";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={
            project.status === "PRODUCTION"
              ? "bg-green-100 text-green-800"
              : project.status === "DELIVERED"
              ? "bg-emerald-100 text-emerald-800"
              : project.status === "APPROVAL_PENDING"
              ? "bg-amber-100 text-amber-800"
              : project.status === "ON_HOLD"
              ? "bg-gray-100 text-gray-800"
              : ""
          }
        >
          {project.status.replaceAll("_", " ")}
        </Badge>
      </div>

      {/* Project info bar */}
      <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
        {project.client && <span>Client: {project.client.name}</span>}
        {project.department && <span>Dept: {project.department.name}</span>}
        {project.startDate && <span>Start: {formatDate(project.startDate)}</span>}
        {project.endDate && <span>Due: {formatDate(project.endDate)}</span>}
        <div className="flex items-center gap-1">
          <span>Team:</span>
          <div className="flex -space-x-2">
            {project.members.slice(0, 5).map((m) => (
              <Avatar key={m.userId} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px]">
                  {m.user.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        <span className="text-xs">{project.tasks.length} tasks</span>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <ProjectTaskViews
            projectId={project.id}
            tasks={project.tasks}
            members={project.members}
            labels={project.labels}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Members</h3>
                  <div className="mt-2 space-y-2">
                    {project.members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {m.user.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{m.user.name}</p>
                            <p className="text-xs text-muted-foreground">{m.user.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
