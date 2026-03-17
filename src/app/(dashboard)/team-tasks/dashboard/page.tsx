import { getTeamTaskAnalytics, getTeamsWithDepartments } from "@/actions/team-tasks";
import { TeamTaskDashboardContent } from "@/components/team-tasks/team-task-dashboard-content";

export default async function TeamTaskDashboardPage() {
  const [analytics, teams] = await Promise.all([
    getTeamTaskAnalytics(),
    getTeamsWithDepartments(),
  ]);

  // Exclude "Design" team — tasks managed in Creative Tickets
  const excludedTeamNames = new Set(["Design"]);
  const excludedTeamSet = new Set(
    teams.filter((t) => excludedTeamNames.has(t.name)).map((t) => t.name)
  );

  const filteredAnalytics = {
    ...analytics,
    teamCounts: analytics.teamCounts.filter((t) => !excludedTeamSet.has(t.name)),
  };

  // Build team name→id map for linking
  const teamIdMap: Record<string, string> = {};
  teams.forEach((t) => {
    if (!excludedTeamSet.has(t.name)) {
      teamIdMap[t.name] = t.id;
    }
  });

  return <TeamTaskDashboardContent data={filteredAnalytics} teamIdMap={teamIdMap} />;
}
