import { getClientMandatesView, getClientMandatesDashboardData } from "@/actions/clients";
import { ClientMandatesContent } from "@/components/client-mandates/client-mandates-content";
import { ClientMandatesTabs } from "@/components/client-mandates/client-mandates-tabs";
import { PerformanceDashboard } from "@/components/client-mandates/performance-dashboard";
import { CreativeDashboard } from "@/components/client-mandates/creative-dashboard";

export default async function ClientMandatesPage() {
  const [clients, dashboardData] = await Promise.all([
    getClientMandatesView(),
    getClientMandatesDashboardData(),
  ]);

  const mandateClients = clients.map((c) => ({
    id: c.id,
    name: c.name,
    mandates: c.mandates,
    sow: c.sow,
    primaryPerformanceOwner: c.primaryPerformanceOwner,
    secondaryPerformanceOwner: c.secondaryPerformanceOwner,
    creativeStrategyOwner: c.creativeStrategyOwner,
  }));

  return (
    <ClientMandatesTabs
      mandatesTab={<ClientMandatesContent clients={mandateClients} />}
      performanceTab={<PerformanceDashboard data={dashboardData} />}
      creativeTab={<CreativeDashboard data={dashboardData} />}
    />
  );
}
