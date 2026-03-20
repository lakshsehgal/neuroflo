import { getProjects } from "@/actions/projects";
import { ProjectsContent } from "@/components/projects/projects-content";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <ProjectsContent
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        endDate: p.endDate ? p.endDate.toISOString() : null,
        clientName: p.client?.name || null,
        videos: p.tasks.map((t) => ({
          id: t.id,
          status: t.status,
          creatorName: t.creatorName,
          shootDate: t.shootDate ? t.shootDate.toISOString() : null,
        })),
        memberCount: p.members.length,
        members: p.members.map((m) => ({
          name: m.user.name,
          avatar: m.user.avatar,
        })),
      }))}
    />
  );
}
