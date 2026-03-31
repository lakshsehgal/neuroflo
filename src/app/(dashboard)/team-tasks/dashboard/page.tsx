import { getTeamTaskAnalytics, getTeamsWithDepartments } from "@/actions/team-tasks";
import { TeamTaskDashboardContent } from "@/components/team-tasks/team-task-dashboard-content";

export default async function TeamTaskDashboardPage() {
  const [analytics, teams] = await Promise.all([
    getTeamTaskAnalytics(),
    getTeamsWithDepartments(),
  ]);

  // Build team name→id map for linking
  const teamIdMap: Record<string, string> = {};
  teams.forEach((t) => {
    teamIdMap[t.name] = t.id;
  });

  return <TeamTaskDashboardContent data={analytics} teamIdMap={teamIdMap} />;
}
