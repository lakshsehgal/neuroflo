import {
  getTeamTasks,
  getTeamsWithDepartments,
  getTeamTaskWorkloadData,
  getCurrentUserTeamIds,
} from "@/actions/team-tasks";
import { getTeamUsers } from "@/actions/tickets";
import { TeamTasksContent } from "@/components/team-tasks/team-tasks-content";

export default async function TeamTasksPage() {
  const [tasks, users, teams, workloadTasks, userTeamIds] = await Promise.all([
    getTeamTasks(),
    getTeamUsers(),
    getTeamsWithDepartments(),
    getTeamTaskWorkloadData(),
    getCurrentUserTeamIds(),
  ]);

  // Exclude Creative department teams from team tasks view
  const excludedDept = "Creative";
  const excludedTeamIds = new Set(
    teams.filter((t) => t.department.name === excludedDept).map((t) => t.id)
  );

  return (
    <TeamTasksContent
      tasks={tasks
        .filter((t) => !excludedTeamIds.has(t.teamId))
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          teamId: t.teamId,
          teamName: t.team.name,
          departmentName: t.team.department.name,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          assigneeId: t.assignee?.id || null,
          assigneeName: t.assignee?.name || null,
          assigneeInitials: t.assignee
            ? t.assignee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
            : null,
          createdByName: t.createdBy?.name || null,
          commentCount: t._count.comments,
        }))}
      users={users}
      teams={teams
        .filter((t) => t.department.name !== excludedDept)
        .map((t) => ({
          id: t.id,
          name: t.name,
          department: t.department,
        }))}
      userTeamIds={userTeamIds.filter((id) => !excludedTeamIds.has(id))}
      workloadTasks={workloadTasks
        .filter((t) => !excludedTeamIds.has(t.teamId))
        .map((t) => ({
          id: t.id,
          status: t.status,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          teamId: t.teamId,
          teamName: t.team.name,
          assigneeId: t.assigneeId,
          assigneeName: t.assignee?.name || null,
          assigneeAvatar: t.assignee?.avatar || null,
        }))}
    />
  );
}
