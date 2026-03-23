import { getGuestProject } from "@/actions/guest-access";
import { notFound } from "next/navigation";
import { GuestProjectView } from "@/components/projects/guest-project-view";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function GuestProjectPage({ params }: Props) {
  const { token } = await params;
  const access = await getGuestProject(token);

  if (!access) notFound();

  const project = access.project;

  return (
    <GuestProjectView
      project={{
        name: project.name,
        clientName: project.client?.name || null,
      }}
      videos={project.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        creatorName: t.creatorName,
        creatorHandle: t.creatorHandle,
        shootDate: t.shootDate ? t.shootDate.toISOString() : null,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        videoUrl: t.videoUrl,
        deliveryLink: t.deliveryLink,
        estimatedDeliveryDate: t.estimatedDeliveryDate ? t.estimatedDeliveryDate.toISOString() : null,
        assigneeName: t.assignee?.name || null,
        revisions: t.revisions.map((r) => ({
          id: r.id,
          version: r.version,
          videoUrl: r.videoUrl,
          note: r.note,
          createdAt: r.createdAt.toISOString(),
          feedbacks: r.feedbacks.map((f) => ({
            id: f.id,
            content: f.content,
            authorName: f.authorName,
            isClient: f.isClient,
            status: f.status,
            createdAt: f.createdAt.toISOString(),
          })),
        })),
      }))}
      token={token}
      guestName={access.name}
    />
  );
}
