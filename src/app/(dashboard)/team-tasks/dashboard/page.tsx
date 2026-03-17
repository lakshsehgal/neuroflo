import { getTeamTaskAnalytics, getTeamsWithDepartments } from "@/actions/team-tasks";
import { TeamTaskDashboardContent } from "@/components/team-tasks/team-task-dashboard-content";

export default async function TeamTaskDashboardPage() {
  const [analytics, teams] = await Promise.all([
    getTeamTaskAnalytics(),
    getTeamsWithDepartments(),
  ]);

  // Only these teams use Team Tasks
  const allowedTeamNames = new Set(["Creative Strategy", "Team Flame", "Team Fire"]);
  const allowedTeamSet = new Set(
    teams.filter((t) => allowedTeamNames.has(t.name)).map((t) => t.name)
  );

  const filteredAnalytics = {
    ...analytics,
    teamCounts: analytics.teamCounts.filter((t) => allowedTeamSet.has(t.name)),
  };

  // Build team name→id map for linking
  const teamIdMap: Record<string, string> = {};
  teams.forEach((t) => {
    if (allowedTeamSet.has(t.name)) {
      teamIdMap[t.name] = t.id;
    }
  });

  return <TeamTaskDashboardContent data={filteredAnalytics} teamIdMap={teamIdMap} />;
}
