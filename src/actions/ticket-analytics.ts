"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";

export async function getTicketAnalytics() {
  await requireAuth();

  const now = new Date();

  // Run all aggregation queries in parallel instead of loading all tickets
  const [
    totalTickets,
    approvedTickets,
    overdueTickets,
    urgentTickets,
    unassignedTickets,
    statusGroups,
    priorityGroups,
    formatGroups,
    typeGroups,
    clientGroups,
    assigneeData,
    avgCompletion,
    weeklyCreated,
    weeklyApproved,
  ] = await Promise.all([
    // Total count
    db.ticket.count(),

    // Approved count
    db.ticket.count({ where: { status: "APPROVED" } }),

    // Overdue count
    db.ticket.count({
      where: { dueDate: { lt: now }, status: { not: "APPROVED" } },
    }),

    // Urgent open count
    db.ticket.count({
      where: { priority: "URGENT", status: { not: "APPROVED" } },
    }),

    // Unassigned open count
    db.ticket.count({
      where: { assigneeId: null, status: { not: "APPROVED" } },
    }),

    // Status breakdown
    db.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    // Priority breakdown
    db.ticket.groupBy({
      by: ["priority"],
      _count: { _all: true },
    }),

    // Format breakdown
    db.ticket.groupBy({
      by: ["format"],
      _count: { _all: true },
    }),

    // Creative type breakdown
    db.ticket.groupBy({
      by: ["creativeType"],
      _count: { _all: true },
    }),

    // Client breakdown
    db.ticket.groupBy({
      by: ["clientName"],
      _count: { _all: true },
      orderBy: { _count: { clientName: "desc" } },
      take: 10,
    }),

    // Assignee workload — grouped counts
    db.ticket.groupBy({
      by: ["assigneeId", "status"],
      where: { assigneeId: { not: null } },
      _count: { _all: true },
    }),

    // Average completion days for approved tickets
    db.$queryRaw<[{ avg_days: number | null }]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400) as avg_days
      FROM "Ticket"
      WHERE status = 'APPROVED'
    `,

    // Weekly created tickets (last 12 weeks)
    db.$queryRaw<{ week_start: Date; count: bigint }[]>`
      SELECT date_trunc('week', "createdAt") as week_start, COUNT(*)::bigint as count
      FROM "Ticket"
      WHERE "createdAt" >= NOW() - INTERVAL '12 weeks'
      GROUP BY week_start
      ORDER BY week_start
    `,

    // Weekly approved tickets (last 12 weeks)
    db.$queryRaw<{ week_start: Date; count: bigint }[]>`
      SELECT date_trunc('week', "updatedAt") as week_start, COUNT(*)::bigint as count
      FROM "Ticket"
      WHERE status = 'APPROVED' AND "updatedAt" >= NOW() - INTERVAL '12 weeks'
      GROUP BY week_start
      ORDER BY week_start
    `,
  ]);

  // Build assignee workload from grouped data
  const assigneeIds = [...new Set(assigneeData.map((a) => a.assigneeId!))];
  const assigneeUsers = assigneeIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, avatar: true },
      })
    : [];
  const userMap = new Map(assigneeUsers.map((u) => [u.id, u]));

  // Aggregate assignee stats
  const assigneeMap: Record<string, { name: string; avatar: string | null; total: number; open: number; approved: number }> = {};
  for (const row of assigneeData) {
    const uid = row.assigneeId!;
    if (!assigneeMap[uid]) {
      const user = userMap.get(uid);
      assigneeMap[uid] = { name: user?.name || "Unknown", avatar: user?.avatar || null, total: 0, open: 0, approved: 0 };
    }
    const count = row._count._all;
    assigneeMap[uid].total += count;
    if (row.status === "APPROVED") assigneeMap[uid].approved += count;
    else assigneeMap[uid].open += count;
  }

  // Overdue per assignee (separate small query)
  const overdueByAssignee = assigneeIds.length > 0
    ? await db.ticket.groupBy({
        by: ["assigneeId"],
        where: { assigneeId: { in: assigneeIds }, dueDate: { lt: now }, status: { not: "APPROVED" } },
        _count: { _all: true },
      })
    : [];

  const assigneeWorkload = Object.entries(assigneeMap)
    .map(([id, data]) => {
      const overdue = overdueByAssignee.find((o) => o.assigneeId === id)?._count._all || 0;
      return { id, ...data, overdue };
    })
    .sort((a, b) => b.open - a.open);

  // Build weekly timeline
  const weeklyMap = new Map<string, { created: number; approved: number }>();
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - day + 1); // align to Monday (date_trunc week)
    const key = weekStart.toISOString().slice(0, 10);
    weeklyMap.set(key, { created: 0, approved: 0 });
  }

  for (const row of weeklyCreated) {
    const key = new Date(row.week_start).toISOString().slice(0, 10);
    const entry = weeklyMap.get(key);
    if (entry) entry.created = Number(row.count);
  }
  for (const row of weeklyApproved) {
    const key = new Date(row.week_start).toISOString().slice(0, 10);
    const entry = weeklyMap.get(key);
    if (entry) entry.approved = Number(row.count);
  }

  const weeklyData = [...weeklyMap.entries()].map(([dateStr, data]) => ({
    week: new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    ...data,
  }));

  const openTickets = totalTickets - approvedTickets;
  const avgCompletionDays = avgCompletion[0]?.avg_days ?? 0;

  return {
    summary: {
      totalTickets,
      openTickets,
      approvedTickets,
      overdueTickets,
      urgentTickets,
      unassignedTickets,
      avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
      approvalRate: totalTickets > 0 ? Math.round((approvedTickets / totalTickets) * 100) : 0,
    },
    statusCounts: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    priorityCounts: priorityGroups.map((g) => ({ priority: g.priority, count: g._count._all })),
    formatCounts: formatGroups.map((g) => ({ format: g.format || "UNSET", count: g._count._all })),
    typeCounts: typeGroups.map((g) => ({ type: g.creativeType || "UNSET", count: g._count._all })),
    assigneeWorkload,
    weeklyData,
    clientCounts: clientGroups.map((g) => ({ client: g.clientName || "No Client", count: g._count._all })),
  };
}
