import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { getFounderDashboardData, getExpenses } from "@/actions/founders";
import { FounderDashboard } from "@/components/admin/founder-dashboard";

export default async function FoundersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [dashboardData, expenses] = await Promise.all([
    getFounderDashboardData(),
    getExpenses(),
  ]);

  return (
    <FounderDashboard
      data={dashboardData}
      expenses={expenses}
    />
  );
}
