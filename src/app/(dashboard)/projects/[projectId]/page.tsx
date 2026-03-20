import { getProject } from "@/actions/projects";
import { getCurrentUser } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import { UGCProjectDetail } from "@/components/projects/ugc-project-detail";

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
    <UGCProjectDetail
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status ?? "ACTIVE",
        clientId: project.clientId,
        clientName: project.client?.name || null,
        departmentId: project.departmentId,
        startDate: project.startDate?.toISOString() || null,
        endDate: project.endDate?.toISOString() || null,
      }}
      videos={project.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        creatorName: t.creatorName,
        creatorHandle: t.creatorHandle,
        shootDate: t.shootDate ? t.shootDate.toISOString() : null,
        videoUrl: t.videoUrl,
        thumbnailUrl: t.thumbnailUrl,
        assignee: t.assignee,
        labels: t.labels,
        _count: t._count,
        subtasks: t.subtasks,
        checklistItems: t.checklistItems,
      }))}
      members={project.members}
      labels={project.labels}
      guestAccess={project.guestAccess}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  );
}
