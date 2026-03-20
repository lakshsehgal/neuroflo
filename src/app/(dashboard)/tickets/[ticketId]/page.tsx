import { getTicket, getCreativeDesignTeamUsers, getClientNames } from "@/actions/tickets";
import { notFound } from "next/navigation";
import { TicketDetailContent } from "@/components/tickets/ticket-detail-content";

interface Props {
  params: Promise<{ ticketId: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { ticketId } = await params;
  const [ticket, users, clients] = await Promise.all([
    getTicket(ticketId),
    getCreativeDesignTeamUsers(),
    getClientNames(),
  ]);
  if (!ticket) notFound();

  return <TicketDetailContent ticket={ticket} users={users} clients={clients} />;
}
