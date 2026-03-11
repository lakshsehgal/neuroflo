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
        endDate: p.endDate ? p.endDate.toISOString() : null,
        clientName: p.client?.name || null,
        taskCount: p._count.tasks,
        memberCount: p.members.length,
      }))}
    />
  );
}
