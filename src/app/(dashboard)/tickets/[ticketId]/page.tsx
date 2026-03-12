import { getTicket } from "@/actions/tickets";
import { notFound } from "next/navigation";
import { TicketDetailContent } from "@/components/tickets/ticket-detail-content";

interface Props {
  params: Promise<{ ticketId: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) notFound();

  return <TicketDetailContent ticket={ticket} />;
}
