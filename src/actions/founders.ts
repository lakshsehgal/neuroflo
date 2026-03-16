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

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const [expenses, allInvoices, clients] = await Promise.all([
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
  };
}
