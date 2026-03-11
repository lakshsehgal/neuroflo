import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [projectCount, ticketCount, assetCount, campaignCount, recentActivity, myTasks, myTickets] =
    await Promise.all([
      db.project.count({ where: { status: "ACTIVE" } }),
      db.ticket.count({ where: { status: { notIn: ["COMPLETED"] } } }),
      db.asset.count(),
      db.campaign.count({ where: { status: "ACTIVE" } }),
      db.activityLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.task.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" } },
        include: { project: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      db.ticket.findMany({
        where: {
          OR: [{ creatorId: user.id }, { assigneeId: user.id }],
          status: { notIn: ["COMPLETED"] },
        },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "Active Projects", value: projectCount, iconName: "FolderKanban", href: "/projects", color: "text-blue-600" },
    { label: "Open Tickets", value: ticketCount, iconName: "Ticket", href: "/tickets", color: "text-orange-600" },
    { label: "Total Assets", value: assetCount, iconName: "Image", href: "/assets", color: "text-green-600" },
    { label: "Active Campaigns", value: campaignCount, iconName: "Megaphone", href: "/repository/campaigns", color: "text-purple-600" },
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
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
