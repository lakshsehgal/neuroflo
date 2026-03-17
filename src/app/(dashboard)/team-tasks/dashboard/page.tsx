import { getTeamTaskAnalytics } from "@/actions/team-tasks";
import { TeamTaskDashboardContent } from "@/components/team-tasks/team-task-dashboard-content";

export default async function TeamTaskDashboardPage() {
  const analytics = await getTeamTaskAnalytics();

  return <TeamTaskDashboardContent data={analytics} />;
}
