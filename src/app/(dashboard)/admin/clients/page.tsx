import { getClients, getRevenueForecasting, getUpcomingReminders, getClientDashboardData, getClientOwnerCandidates } from "@/actions/clients";
import { getCurrentUser } from "@/lib/permissions";
import { ClientsManagement } from "@/components/admin/clients-management";

export default async function AdminClientsPage() {
  const [clients, revenueData, reminders, dashboardData, ownerCandidates, currentUser] = await Promise.all([
    getClients(),
    getRevenueForecasting(),
    getUpcomingReminders(),
    getClientDashboardData(),
    getClientOwnerCandidates(),
    getCurrentUser(),
  ]);

  // Calculate this month's estimated revenue
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let thisMonthRevenue = 0;
  let nextMonthRevenue = 0;

  // Revenue forecasting already excludes churned clients from the query
  for (const client of revenueData) {
    const monthlyAmount = client.avgBillingAmount || 0;
    const oneTimeAmount = client.oneTimeProjectAmount || 0;
    const hasInvoiceThisMonth = client.invoices.some((inv) => {
      const d = new Date(inv.dueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (hasInvoiceThisMonth) {
      const invoiceAmount = client.invoices
        .filter((inv) => {
          const d = new Date(inv.dueDate);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);
      thisMonthRevenue += invoiceAmount;
    } else if (monthlyAmount > 0 || oneTimeAmount > 0) {
      thisMonthRevenue += monthlyAmount + oneTimeAmount;
    }

    // Next month
    const nextMonth = (currentMonth + 1) % 12;
    const nextYear = nextMonth === 0 ? currentYear + 1 : currentYear;
    const hasInvoiceNextMonth = client.invoices.some((inv) => {
      const d = new Date(inv.dueDate);
      return d.getMonth() === nextMonth && d.getFullYear() === nextYear;
    });

    if (hasInvoiceNextMonth) {
      const invoiceAmount = client.invoices
        .filter((inv) => {
          const d = new Date(inv.dueDate);
          return d.getMonth() === nextMonth && d.getFullYear() === nextYear;
        })
        .reduce((sum, inv) => sum + inv.amount, 0);
      nextMonthRevenue += invoiceAmount;
    } else if (monthlyAmount > 0) {
      // One-time amounts only count once (this month), not recurring
      nextMonthRevenue += monthlyAmount;
    }
  }

  return (
    <ClientsManagement
      clients={clients}
      reminders={reminders}
      thisMonthRevenue={thisMonthRevenue}
      nextMonthRevenue={nextMonthRevenue}
      dashboardData={dashboardData}
      ownerCandidates={ownerCandidates}
      currentUserId={currentUser?.id || ""}
    />
  );
}
