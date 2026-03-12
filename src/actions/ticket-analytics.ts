"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";

export async function getTicketAnalytics() {
  await requireAuth();

  const allTickets = await db.ticket.findMany({
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true } },
    },
  });

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  for (const t of allTickets) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

  // Priority breakdown
  const priorityCounts: Record<string, number> = {};
  for (const t of allTickets) {
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  }

  // Format breakdown
  const formatCounts: Record<string, number> = {};
  for (const t of allTickets) {
    const fmt = t.format || "UNSET";
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
  }

  // Creative type breakdown
  const typeCounts: Record<string, number> = {};
  for (const t of allTickets) {
    const ct = t.creativeType || "UNSET";
    typeCounts[ct] = (typeCounts[ct] || 0) + 1;
  }

  // Assignee workload
  const assigneeMap: Record<string, { name: string; avatar: string | null; total: number; open: number; approved: number; overdue: number }> = {};
  const now = new Date();
  for (const t of allTickets) {
    if (!t.assignee) continue;
    if (!assigneeMap[t.assignee.id]) {
      assigneeMap[t.assignee.id] = { name: t.assignee.name, avatar: t.assignee.avatar, total: 0, open: 0, approved: 0, overdue: 0 };
    }
    const entry = assigneeMap[t.assignee.id];
    entry.total++;
    if (t.status === "APPROVED") entry.approved++;
    else entry.open++;
    if (t.dueDate && t.dueDate < now && t.status !== "APPROVED") entry.overdue++;
  }

  // Tickets over time (by week for last 12 weeks)
  const weeklyData: { week: string; created: number; approved: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const created = allTickets.filter(
      (t) => t.createdAt >= weekStart && t.createdAt < weekEnd
    ).length;
    const approved = allTickets.filter(
      (t) =>
        t.status === "APPROVED" &&
        t.updatedAt >= weekStart &&
        t.updatedAt < weekEnd
    ).length;

    weeklyData.push({
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      created,
      approved,
    });
  }

  // Client breakdown
  const clientCounts: Record<string, number> = {};
  for (const t of allTickets) {
    const client = t.clientName || "No Client";
    clientCounts[client] = (clientCounts[client] || 0) + 1;
  }

  // Summary stats
  const totalTickets = allTickets.length;
  const openTickets = allTickets.filter((t) => t.status !== "APPROVED").length;
  const approvedTickets = allTickets.filter((t) => t.status === "APPROVED").length;
  const overdueTickets = allTickets.filter(
    (t) => t.dueDate && t.dueDate < now && t.status !== "APPROVED"
  ).length;
  const urgentTickets = allTickets.filter(
    (t) => t.priority === "URGENT" && t.status !== "APPROVED"
  ).length;
  const unassignedTickets = allTickets.filter(
    (t) => !t.assigneeId && t.status !== "APPROVED"
  ).length;

  // Average time to completion (for approved tickets with dates)
  const approvedWithDates = allTickets.filter(
    (t) => t.status === "APPROVED" && t.createdAt && t.updatedAt
  );
  const avgCompletionDays =
    approvedWithDates.length > 0
      ? approvedWithDates.reduce((sum, t) => {
          const days = (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / approvedWithDates.length
      : 0;

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
    statusCounts: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    priorityCounts: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
    formatCounts: Object.entries(formatCounts).map(([format, count]) => ({ format, count })),
    typeCounts: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
    assigneeWorkload: Object.entries(assigneeMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.open - a.open),
    weeklyData,
    clientCounts: Object.entries(clientCounts)
      .map(([client, count]) => ({ client, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}
