import { getTickets, getCreativeDesignTeamUsers, getClientNames, getTicketWorkloadData } from "@/actions/tickets";
import { TicketsContent } from "@/components/tickets/tickets-content";

export default async function TicketsPage() {
  const [tickets, users, clients, workloadTickets] = await Promise.all([
    getTickets(),
    getCreativeDesignTeamUsers(),
    getClientNames(),
    getTicketWorkloadData(),
  ]);

  // Collect distinct assignedBy names for the filter
  const assignedByNames = [...new Set(tickets.map((t) => t.assignedBy?.name).filter(Boolean))] as string[];

  return (
    <TicketsContent
      tickets={tickets.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        format: t.format,
        creativeType: t.creativeType,
        clientName: t.clientName,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deliveryLink: t.deliveryLink,
        assigneeId: t.assignee?.id || null,
        assigneeName: t.assignee?.name || null,
        assigneeInitials: t.assignee
          ? t.assignee.name.split(" ").map((n) => n[0]).join("")
          : null,
        assignedByName: t.assignedBy?.name || null,
        revisionCount: t._count.revisions,
        commentCount: t._count.comments,
      }))}
      users={users}
      clients={clients}
      assignedByNames={assignedByNames}
      workloadTickets={workloadTickets.map((t) => ({
        id: t.id,
        status: t.status,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assigneeId: t.assigneeId,
        assigneeName: t.assignee?.name || null,
        assigneeAvatar: t.assignee?.avatar || null,
      }))}
    />
  );
}
