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
    myProjectCount,
    myTicketCount,
    recentActivity,
    myTasks,
    myTickets,
    myTeamTaskCount,
    myTeamTasks,
    upcomingProjectDeadlines,
    upcomingTeamDeadlines,
    unreadChannels,
    recentMentions,
    dbUser,
  ] = await Promise.all([
    // Projects where user has assigned tasks
    db.project.count({
      where: {
        tasks: { some: { assigneeId: user.id } },
      },
    }),
    // User's open tickets (created or assigned)
    db.ticket.count({
      where: {
        OR: [{ creatorId: user.id }, { assigneeId: user.id }],
        status: { notIn: ["APPROVED"] },
      },
    }),
    // Recent activity on entities the user is involved with
    db.activityLog.findMany({
      where: {
        OR: [
          { userId: user.id },
          {
            entityType: "TASK",
            entityId: {
              in: await db.task
                .findMany({ where: { assigneeId: user.id }, select: { id: true } })
                .then((t) => t.map((x) => x.id)),
            },
          },
          {
            entityType: "TICKET",
            entityId: {
              in: await db.ticket
                .findMany({
                  where: { OR: [{ creatorId: user.id }, { assigneeId: user.id }] },
                  select: { id: true },
                })
                .then((t) => t.map((x) => x.id)),
            },
          },
          {
            entityType: "TEAM_TASK",
            entityId: {
              in: await db.teamTask
                .findMany({ where: { assigneeId: user.id }, select: { id: true } })
                .then((t) => t.map((x) => x.id)),
            },
          },
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
    // Unread channels with last message preview
    db.channelMember.findMany({
      where: { userId: user.id },
      include: {
        channel: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { author: { select: { name: true } } },
            },
          },
        },
      },
    }).then(async (memberships) => {
      const channels = [];
      for (const m of memberships) {
        const unreadCount = await db.message.count({
          where: {
            channelId: m.channelId,
            parentId: null,
            createdAt: { gt: m.lastReadAt },
            authorId: { not: user.id },
          },
        });
        if (unreadCount > 0) {
          const lastMsg = m.channel.messages[0];
          channels.push({
            channelId: m.channelId,
            channelName: m.channel.name,
            unreadCount,
            lastMessage: lastMsg
              ? { content: lastMsg.content, authorName: lastMsg.author.name, createdAt: lastMsg.createdAt.toISOString() }
              : null,
          });
        }
      }
      return channels.sort((a, b) => b.unreadCount - a.unreadCount);
    }),
    // Recent @mentions of the user in messages
    db.message.findMany({
      where: {
        content: { contains: `@${user.name}` },
        authorId: { not: user.id },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        author: { select: { name: true, avatar: true } },
        channel: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // User's Google Calendar status
    db.user.findUnique({
      where: { id: user.id },
      select: { googleCalendarConnected: true },
    }),
  ]);

  // Overdue tasks count (project + team)
  const [overdueProjectCount, overdueTeamCount] = await Promise.all([
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

  const totalUnreadMessages = unreadChannels.reduce((sum, c) => sum + c.unreadCount, 0);

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
      unreadChannels={unreadChannels}
      recentMentions={recentMentions.map((m) => ({
        id: m.id,
        content: m.content,
        authorName: m.author.name,
        authorAvatar: m.author.avatar,
        channelName: m.channel.name,
        channelId: m.channelId,
        createdAt: m.createdAt.toISOString(),
      }))}
      overdueCount={overdueCount}
      unreadMessages={totalUnreadMessages}
      calendarConnected={dbUser?.googleCalendarConnected ?? false}
    />
  );
}
