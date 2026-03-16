import { getTicketAnalytics } from "@/actions/ticket-analytics";
import { TicketDashboardContent } from "@/components/tickets/ticket-dashboard-content";

export default async function TicketDashboardPage() {
  const analytics = await getTicketAnalytics();

  return <TicketDashboardContent data={analytics} />;
}
