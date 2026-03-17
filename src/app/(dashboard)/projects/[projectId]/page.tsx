import { getProject } from "@/actions/projects";
import { getCurrentUser } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectTaskViews } from "@/components/projects/project-task-views";
import { ProjectSettings } from "@/components/projects/project-settings";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge
            variant="secondary"
            className={project.status === "CLOSED"
              ? "bg-slate-100 text-slate-600"
              : "bg-green-100 text-green-700"
            }
          >
            {project.status === "CLOSED" ? "Closed" : "Active"}
          </Badge>
        </div>
        {project.description && (
          <p className="mt-1 text-muted-foreground">{project.description}</p>
        )}
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
          <ProjectSettings
            projectId={project.id}
            projectName={project.name}
            projectDescription={project.description}
            projectStatus={project.status ?? "ACTIVE"}
            projectClientId={project.clientId}
            projectDepartmentId={project.departmentId}
            projectStartDate={project.startDate?.toISOString() || null}
            projectEndDate={project.endDate?.toISOString() || null}
            members={project.members}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
