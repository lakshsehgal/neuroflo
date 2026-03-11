import { getProject } from "@/actions/projects";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskBoard } from "@/components/projects/task-board";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) notFound();

  const tasksByStatus = {
    TODO: project.tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: project.tasks.filter((t) => t.status === "IN_PROGRESS"),
    IN_REVIEW: project.tasks.filter((t) => t.status === "IN_REVIEW"),
    DONE: project.tasks.filter((t) => t.status === "DONE"),
  };

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
            project.status === "ACTIVE"
              ? "bg-green-100 text-green-800"
              : project.status === "COMPLETED"
              ? "bg-blue-100 text-blue-800"
              : ""
          }
        >
          {project.status.replace("_", " ")}
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
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({project.tasks.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TaskBoard projectId={project.id} tasksByStatus={tasksByStatus} />
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
