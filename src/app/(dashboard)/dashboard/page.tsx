import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  // Pre-fetch entity IDs for activity log (needed before main query batch)
  const [myTaskIds, myTicketIds, myTeamTaskIds] = await Promise.all([
    db.task.findMany({ where: { assigneeId: user.id }, select: { id: true } }).then((t) => t.map((x) => x.id)),
    db.ticket.findMany({ where: { OR: [{ creatorId: user.id }, { assigneeId: user.id }] }, select: { id: true } }).then((t) => t.map((x) => x.id)),
    db.teamTask.findMany({ where: { assigneeId: user.id }, select: { id: true } }).then((t) => t.map((x) => x.id)),
  ]);

  // Now run all dashboard queries truly in parallel
  const [
    myProjectCount,
    myTicketCount,
    recentActivity,
    myTasks,
    myTickets,
    myTeamTaskCount,
    myTeamTasks,
    upcomingProjectDeadlines,
    upcomingTeamDeadlines,
    dbUser,
    overdueProjectCount,
    overdueTeamCount,
  ] = await Promise.all([
    // Projects where user has assigned tasks
    db.project.count({
      where: { tasks: { some: { assigneeId: user.id } } },
    }),
    // User's open tickets (created or assigned)
    db.ticket.count({
      where: {
        OR: [{ creatorId: user.id }, { assigneeId: user.id }],
        status: { notIn: ["APPROVED"] },
      },
    }),
    // Recent activity — no nested awaits now
    db.activityLog.findMany({
      where: {
        OR: [
          { userId: user.id },
          { entityType: "TASK", entityId: { in: myTaskIds } },
          { entityType: "TICKET", entityId: { in: myTicketIds } },
          { entityType: "TEAM_TASK", entityId: { in: myTeamTaskIds } },
        ],
      },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    // My project tasks
    db.task.findMany({
      where: { assigneeId: user.id, status: { notIn: ["DELIVERED", "ON_HOLD"] } },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // My tickets
    db.ticket.findMany({
      where: {
        OR: [{ creatorId: user.id }, { assigneeId: user.id }],
        status: { notIn: ["APPROVED"] },
      },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    // My team tasks count
    db.teamTask.count({
      where: { assigneeId: user.id, status: { notIn: ["DONE", "ON_HOLD"] } },
    }),
    // My team tasks list
    db.teamTask.findMany({
      where: { assigneeId: user.id, status: { notIn: ["DONE", "ON_HOLD"] } },
      include: { team: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 5,
    }),
    // Upcoming deadlines (project tasks)
    db.task.findMany({
      where: {
        assigneeId: user.id,
        status: { notIn: ["DELIVERED", "ON_HOLD"] },
        dueDate: { gte: now, lte: weekFromNow },
      },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    // Upcoming deadlines (team tasks)
    db.teamTask.findMany({
      where: {
        assigneeId: user.id,
        status: { notIn: ["DONE", "ON_HOLD"] },
        dueDate: { gte: now, lte: weekFromNow },
      },
      include: { team: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    // User's Google Calendar status
    db.user.findUnique({
      where: { id: user.id },
      select: { googleCalendarConnected: true },
    }),
    // Overdue counts — now parallel with everything else
    db.task.count({
      where: {
        assigneeId: user.id,
        status: { notIn: ["DELIVERED", "ON_HOLD"] },
        dueDate: { lt: now },
      },
    }),
    db.teamTask.count({
      where: {
        assigneeId: user.id,
        status: { notIn: ["DONE", "ON_HOLD"] },
        dueDate: { lt: now },
      },
    }),
  ]);

  const overdueCount = overdueProjectCount + overdueTeamCount;

  // Merge project + team task deadlines into one sorted list
  const upcomingDeadlines = [
    ...upcomingProjectDeadlines.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      source: "project" as const,
      sourceName: t.project.name,
      dueDate: t.dueDate!.toISOString(),
      priority: t.priority,
      status: t.status,
    })),
    ...upcomingTeamDeadlines.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: null as string | null,
      source: "team" as const,
      sourceName: t.team.name,
      dueDate: t.dueDate!.toISOString(),
      priority: t.priority,
      status: t.status,
    })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
   .slice(0, 8);

  const stats = [
    { label: "My Projects", value: myProjectCount, iconName: "FolderKanban", href: "/projects", color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { label: "My Tickets", value: myTicketCount, iconName: "Ticket", href: "/tickets", color: "text-orange-600", bgColor: "bg-orange-500/10" },
    { label: "My Team Tasks", value: myTeamTaskCount, iconName: "CheckSquare", href: "/team-tasks", color: "text-green-600", bgColor: "bg-green-500/10" },
    { label: "Due This Week", value: upcomingDeadlines.length, iconName: "User", href: "/team-tasks", color: "text-purple-600", bgColor: "bg-purple-500/10" },
  ];

  return (
    <DashboardContent
      userName={user.name.split(" ")[0]}
      stats={stats}
      myTasks={myTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        projectName: t.project.name,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() || null,
        status: t.status,
      }))}
      myTeamTasks={myTeamTasks.map((t) => ({
        id: t.id,
        title: t.title,
        teamName: t.team.name,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() || null,
        status: t.status,
      }))}
      myTickets={myTickets.map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.project?.name || null,
        status: t.status,
      }))}
      recentActivity={recentActivity.map((a) => ({
        id: a.id,
        userName: a.user.name,
        userAvatar: a.user.avatar,
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt.toISOString(),
      }))}
      upcomingDeadlines={upcomingDeadlines}
      overdueCount={overdueCount}
      calendarConnected={dbUser?.googleCalendarConnected ?? false}
    />
  );
}
