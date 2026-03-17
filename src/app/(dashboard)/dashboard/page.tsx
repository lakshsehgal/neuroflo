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

  const [
    projectCount,
    ticketCount,
    recentActivity,
    myTasks,
    myTickets,
    taskCount,
    upcomingDeadlines,
    teamMembers,
    unreadMessages,
    dbUser,
  ] = await Promise.all([
    db.project.count(),
    db.ticket.count({ where: { status: { notIn: ["APPROVED"] } } }),
    db.activityLog.findMany({
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    db.task.findMany({
      where: { assigneeId: user.id, status: { notIn: ["DELIVERED", "ON_HOLD"] } },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.ticket.findMany({
      where: {
        OR: [{ creatorId: user.id }, { assigneeId: user.id }],
        status: { notIn: ["APPROVED"] },
      },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.task.count({ where: { status: { notIn: ["DELIVERED", "ON_HOLD"] } } }),
    // Upcoming deadlines - tasks with due dates in next 7 days
    db.task.findMany({
      where: {
        assigneeId: user.id,
        status: { notIn: ["DELIVERED", "ON_HOLD"] },
        dueDate: { gte: now, lte: weekFromNow },
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    // Team members
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, avatar: true, position: true, role: true },
      orderBy: { name: "asc" },
      take: 12,
    }),
    // Unread messages count
    db.channelMember.findMany({
      where: { userId: user.id },
      select: { channelId: true, lastReadAt: true },
    }).then(async (memberships) => {
      let total = 0;
      for (const m of memberships) {
        const count = await db.message.count({
          where: { channelId: m.channelId, createdAt: { gt: m.lastReadAt } },
        });
        total += count;
      }
      return total;
    }),
    // User's Google Calendar status
    db.user.findUnique({
      where: { id: user.id },
      select: { googleCalendarConnected: true },
    }),
  ]);

  // Overdue tasks count
  const overdueCount = await db.task.count({
    where: {
      assigneeId: user.id,
      status: { notIn: ["DELIVERED", "ON_HOLD"] },
      dueDate: { lt: now },
    },
  });

  const stats = [
    { label: "Projects", value: projectCount, iconName: "FolderKanban", href: "/projects", color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { label: "Open Tickets", value: ticketCount, iconName: "Ticket", href: "/tickets", color: "text-orange-600", bgColor: "bg-orange-500/10" },
    { label: "Active Tasks", value: taskCount, iconName: "CheckSquare", href: "/projects", color: "text-green-600", bgColor: "bg-green-500/10" },
    { label: "My Tasks", value: myTasks.length, iconName: "User", href: "/projects", color: "text-purple-600", bgColor: "bg-purple-500/10" },
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
      upcomingDeadlines={upcomingDeadlines.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        projectName: t.project.name,
        dueDate: t.dueDate!.toISOString(),
        priority: t.priority,
        status: t.status,
      }))}
      teamMembers={teamMembers.map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        position: m.position,
        role: m.role,
      }))}
      overdueCount={overdueCount}
      unreadMessages={unreadMessages}
      calendarConnected={dbUser?.googleCalendarConnected ?? false}
    />
  );
}
