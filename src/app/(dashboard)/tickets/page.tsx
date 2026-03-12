import { getTickets } from "@/actions/tickets";
import { TicketsContent } from "@/components/tickets/tickets-content";

export default async function TicketsPage() {
  const tickets = await getTickets();

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
        deliveryLink: t.deliveryLink,
        assigneeName: t.assignee?.name || null,
        assigneeInitials: t.assignee
          ? t.assignee.name.split(" ").map((n) => n[0]).join("")
          : null,
        assignedByName: t.assignedBy?.name || null,
      }))}
    />
  );
}
