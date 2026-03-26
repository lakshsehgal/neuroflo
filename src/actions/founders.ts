"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

const expenseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["SALARIES", "TOOLS", "OFFICE", "MARKETING", "OTHER"]),
  amount: z.number().positive(),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"]),
  notes: z.string().optional(),
});

export async function createExpense(
  input: z.infer<typeof expenseSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("ADMIN");

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const expense = await db.expense.create({ data: parsed.data });

  revalidatePath("/admin/founders");
  return { success: true, data: { id: expense.id } };
}

export async function updateExpense(
  id: string,
  input: z.infer<typeof expenseSchema>
): Promise<ActionResponse> {
  await requireRole("ADMIN");

  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  await db.expense.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/founders");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<ActionResponse> {
  await requireRole("ADMIN");

  await db.expense.delete({ where: { id } });

  revalidatePath("/admin/founders");
  return { success: true };
}

export async function getExpenses() {
  await requireRole("ADMIN");

  return db.expense.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { amount: "desc" }],
  });
}

// Compute monthly cost from expense based on its frequency
function monthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
    case "ONE_TIME":
      return 0; // excluded from recurring
    default:
      return amount;
  }
}

export async function getFounderDashboardData() {
  await requireRole("ADMIN");

  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const [
    expenses,
    allInvoices,
    clients,
    allClients,
    activeProjects,
    totalTasks,
    deliveredTasks,
    overdueTasks,
    totalTickets,
    approvedTickets,
    totalTeamTasks,
    doneTeamTasks,
    blockedTeamTasks,
    teamMembers,
    recentActivity,
  ] = await Promise.all([
    db.expense.findMany({ where: { isActive: true } }),
    db.invoice.findMany({
      where: { dueDate: { gte: twelveMonthsAgo } },
      select: {
        id: true,
        amount: true,
        status: true,
        dueDate: true,
        paidDate: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.client.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        avgBillingAmount: true,
        oneTimeProjectAmount: true,
        sentimentStatus: true,
        _count: { select: { invoices: true, projects: true } },
      },
    }),
    // All clients (active + churned) for health overview
    db.client.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        sentimentStatus: true,
        avgBillingAmount: true,
        engagementStartDate: true,
      },
    }),
    // Active projects count
    db.project.count({ where: { status: "ACTIVE" } }),
    // Total tasks
    db.task.count(),
    // Delivered tasks
    db.task.count({ where: { status: "DELIVERED" } }),
    // Overdue tasks (past due, not delivered)
    db.task.count({
      where: {
        dueDate: { lt: now },
        status: { not: "DELIVERED" },
      },
    }),
    // Total tickets
    db.ticket.count(),
    // Approved tickets
    db.ticket.count({ where: { status: "APPROVED" } }),
    // Total team tasks
    db.teamTask.count(),
    // Done team tasks
    db.teamTask.count({ where: { status: "DONE" } }),
    // Blocked team tasks
    db.teamTask.count({ where: { status: "BLOCKED" } }),
    // Active team members
    db.user.count({ where: { isActive: true } }),
    // Recent activity (last 7 days)
    db.activityLog.count({
      where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Calculate total monthly expenses by category
  const expensesByCategory: Record<string, number> = {};
  let totalMonthlyExpenses = 0;
  let totalOneTimeExpenses = 0;

  for (const exp of expenses) {
    const monthly = monthlyAmount(exp.amount, exp.frequency);
    totalMonthlyExpenses += monthly;
    if (exp.frequency === "ONE_TIME") totalOneTimeExpenses += exp.amount;
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + monthly;
  }

  // Revenue from invoices (paid)
  const paidInvoices = allInvoices.filter((i) => i.status === "PAID");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = allInvoices
    .filter((i) => ["PENDING", "SENT"].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0);
  const overdueRevenue = allInvoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.amount, 0);

  // Monthly revenue trend
  const monthlyRevenue: { month: string; revenue: number; expenses: number; profit: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const m = d.getMonth();
    const y = d.getFullYear();

    const revenue = paidInvoices
      .filter((inv) => {
        const pd = new Date(inv.paidDate || inv.dueDate);
        return pd.getMonth() === m && pd.getFullYear() === y;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    monthlyRevenue.push({
      month,
      revenue,
      expenses: totalMonthlyExpenses,
      profit: revenue - totalMonthlyExpenses,
    });
  }

  // Client dependency - revenue concentration
  const clientRevenue: { name: string; revenue: number; percentage: number }[] = [];
  const revenueByClient: Record<string, { name: string; total: number }> = {};
  for (const inv of paidInvoices) {
    if (!revenueByClient[inv.clientId]) {
      revenueByClient[inv.clientId] = { name: inv.client.name, total: 0 };
    }
    revenueByClient[inv.clientId].total += inv.amount;
  }
  const sorted = Object.values(revenueByClient).sort((a, b) => b.total - a.total);
  for (const c of sorted) {
    clientRevenue.push({
      name: c.name,
      revenue: c.total,
      percentage: totalRevenue > 0 ? (c.total / totalRevenue) * 100 : 0,
    });
  }

  // Expected monthly revenue from active clients
  const expectedMonthlyRevenue = clients.reduce(
    (sum, c) => sum + (c.avgBillingAmount || 0),
    0
  );

  // Revenue growth: compare last 2 months
  const lastMonthRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
  const prevMonthRevenue = monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0;
  const revenueGrowth = prevMonthRevenue > 0
    ? ((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
    : 0;

  // Client health breakdown
  const clientHealth = {
    happy: allClients.filter((c) => c.status === "ACTIVE" && c.sentimentStatus === "HAPPY").length,
    neutral: allClients.filter((c) => c.status === "ACTIVE" && c.sentimentStatus === "NEUTRAL").length,
    atRisk: allClients.filter((c) => c.status === "ACTIVE" && c.sentimentStatus === "AT_RISK").length,
    churned: allClients.filter((c) => c.status === "CHURNED" || c.sentimentStatus === "CHURNED").length,
    total: allClients.length,
    activeCount: allClients.filter((c) => c.status === "ACTIVE").length,
  };

  // Clients with overdue invoices
  const overdueByClient: Record<string, { name: string; amount: number }> = {};
  for (const inv of allInvoices.filter((i) => i.status === "OVERDUE")) {
    if (!overdueByClient[inv.clientId]) {
      overdueByClient[inv.clientId] = { name: inv.client.name, amount: 0 };
    }
    overdueByClient[inv.clientId].amount += inv.amount;
  }
  const overdueClients = Object.values(overdueByClient).sort((a, b) => b.amount - a.amount);

  // Upcoming invoices due in next 7 days
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingInvoices = allInvoices
    .filter(
      (i) =>
        ["PENDING", "SENT"].includes(i.status) &&
        new Date(i.dueDate) <= sevenDaysFromNow &&
        new Date(i.dueDate) >= now
    )
    .map((i) => ({
      clientName: i.client.name,
      amount: i.amount,
      dueDate: i.dueDate,
    }));

  // Burn rate & runway
  const burnRate = totalMonthlyExpenses;
  // Use cash collected last 3 months as avg incoming
  const last3MonthsRevenue = monthlyRevenue.slice(-3).reduce((s, m) => s + m.revenue, 0) / 3;

  // Task completion rate
  const taskCompletionRate = totalTasks > 0 ? (deliveredTasks / totalTasks) * 100 : 0;
  const ticketCompletionRate = totalTickets > 0 ? (approvedTickets / totalTickets) * 100 : 0;
  const teamTaskCompletionRate = totalTeamTasks > 0 ? (doneTeamTasks / totalTeamTasks) * 100 : 0;

  // Revenue per client (active clients only)
  const revenuePerClient = clientHealth.activeCount > 0
    ? totalRevenue / clientHealth.activeCount
    : 0;

  return {
    expenses: {
      totalMonthly: totalMonthlyExpenses,
      totalOneTime: totalOneTimeExpenses,
      byCategory: expensesByCategory,
      items: expenses,
    },
    revenue: {
      totalCollected: totalRevenue,
      pending: pendingRevenue,
      overdue: overdueRevenue,
      expectedMonthly: expectedMonthlyRevenue,
    },
    monthlyTrend: monthlyRevenue,
    clientRevenue,
    clients,
    profitEstimate: {
      monthlyRevenue: expectedMonthlyRevenue,
      monthlyExpenses: totalMonthlyExpenses,
      monthlyProfit: expectedMonthlyRevenue - totalMonthlyExpenses,
      margin: expectedMonthlyRevenue > 0
        ? ((expectedMonthlyRevenue - totalMonthlyExpenses) / expectedMonthlyRevenue) * 100
        : 0,
    },
    // New: Founder Insights
    founderInsights: {
      revenueGrowth,
      lastMonthRevenue,
      prevMonthRevenue,
      burnRate,
      avgMonthlyIncoming: last3MonthsRevenue,
      revenuePerClient,
    },
    clientHealth,
    overdueClients,
    upcomingInvoices,
    operations: {
      activeProjects,
      totalTasks,
      deliveredTasks,
      overdueTasks,
      taskCompletionRate,
      totalTickets,
      approvedTickets,
      ticketCompletionRate,
      totalTeamTasks,
      doneTeamTasks,
      blockedTeamTasks,
      teamTaskCompletionRate,
      teamMembers,
      recentActivity,
    },
  };
}
