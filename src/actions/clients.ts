"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

const clientSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  sow: z.string().optional(),
  status: z.enum(["ACTIVE", "CHURNED"]).optional(),
  sentimentStatus: z.enum(["HAPPY", "NEUTRAL", "AT_RISK", "CHURNED"]).optional(),
  avgBillingAmount: z.number().optional().nullable(),
  oneTimeProjectAmount: z.number().optional().nullable(),
  decidedCommercials: z.string().optional(),
  invoicingDueDay: z.number().optional().nullable(),
  reminderDaysBefore: z.number().optional(),
  mandates: z.array(z.string()).optional(),
  performanceMisLink: z.string().optional(),
  creativeMisLink: z.string().optional(),
  performanceSentiment: z.enum(["HAPPY", "NEUTRAL", "AT_RISK", "CHURNED"]).optional(),
  creativeSentiment: z.enum(["HAPPY", "NEUTRAL", "AT_RISK", "CHURNED"]).optional(),
  engagementStartDate: z.string().optional(),
});

export async function createClient(
  input: z.infer<typeof clientSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("OPERATOR");

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const { engagementStartDate, ...rest } = parsed.data;
  const client = await db.client.create({
    data: {
      ...rest,
      engagementStartDate: engagementStartDate ? new Date(engagementStartDate) : undefined,
    },
  });

  revalidatePath("/admin/clients");
  return { success: true, data: { id: client.id } };
}

export async function updateClient(
  id: string,
  input: z.infer<typeof clientSchema>
): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const { engagementStartDate: esd, ...updateRest } = parsed.data;
  await db.client.update({
    where: { id },
    data: {
      ...updateRest,
      engagementStartDate: esd ? new Date(esd) : undefined,
    },
  });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { success: true };
}

// Partial update for inline editing from the list
export async function updateClientField(
  id: string,
  field: string,
  value: string | number | null
): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  const allowedFields = [
    "status", "sentimentStatus", "avgBillingAmount", "oneTimeProjectAmount",
    "decidedCommercials", "invoicingDueDay", "reminderDaysBefore",
    "sow", "notes", "contactName", "contactEmail", "contactPhone",
    "website", "industry", "name", "mandates",
    "performanceMisLink", "creativeMisLink",
    "primaryPerformanceOwnerId", "secondaryPerformanceOwnerId", "creativeStrategyOwnerId",
    "performanceSentiment", "creativeSentiment",
    "engagementStartDate",
  ];
  if (!allowedFields.includes(field)) {
    return { success: false, error: "Invalid field" };
  }

  const dbValue = field === "engagementStartDate" && typeof value === "string" ? new Date(value) : value;
  await db.client.update({ where: { id }, data: { [field]: dbValue } });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { success: true };
}

export async function updateClientMandates(
  id: string,
  mandates: string[]
): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  await db.client.update({ where: { id }, data: { mandates } });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/client-mandates");
  return { success: true };
}

// Read-only: accessible to all authenticated users for the Client Mandates page
export async function getClientMandatesView() {
  // No role restriction — all authenticated users can view
  const { requireAuth } = await import("@/lib/permissions");
  await requireAuth();

  return db.client.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      mandates: true,
      sow: true,
      performanceMisLink: true,
      creativeMisLink: true,
      primaryPerformanceOwner: { select: { id: true, name: true } },
      secondaryPerformanceOwner: { select: { id: true, name: true } },
      creativeStrategyOwner: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getClients() {
  await requireRole("OPERATOR");

  return db.client.findMany({
    include: {
      _count: { select: { projects: true, invoices: true } },
      invoices: {
        select: { id: true, status: true, dueDate: true, amount: true },
        orderBy: { dueDate: "asc" },
      },
      primaryPerformanceOwner: { select: { id: true, name: true } },
      secondaryPerformanceOwner: { select: { id: true, name: true } },
      creativeStrategyOwner: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getClient(id: string) {
  await requireRole("OPERATOR");

  return db.client.findUnique({
    where: { id },
    include: {
      projects: { select: { id: true, name: true } },
      invoices: {
        include: { payments: { orderBy: { paidAt: "desc" } } },
        orderBy: { dueDate: "desc" },
      },
      primaryPerformanceOwner: { select: { id: true, name: true } },
      secondaryPerformanceOwner: { select: { id: true, name: true } },
      creativeStrategyOwner: { select: { id: true, name: true } },
    },
  });
}

export async function deleteClient(id: string): Promise<ActionResponse> {
  await requireRole("OPERATOR");
  await db.client.delete({ where: { id } });
  revalidatePath("/admin/clients");
  return { success: true };
}

// Invoice actions
const invoiceSchema = z.object({
  clientId: z.string(),
  amount: z.number().positive(),
  gstRate: z.number().min(0).max(100).optional(),
  dueDate: z.string(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function createInvoice(
  input: z.infer<typeof invoiceSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("OPERATOR");

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const invoice = await db.invoice.create({
    data: {
      clientId: parsed.data.clientId,
      amount: parsed.data.amount,
      gstRate: parsed.data.gstRate ?? 18,
      dueDate: new Date(parsed.data.dueDate),
      invoiceNumber: parsed.data.invoiceNumber,
      notes: parsed.data.notes,
    },
  });

  revalidatePath(`/admin/clients/${parsed.data.clientId}`);
  return { success: true, data: { id: invoice.id } };
}

export async function updateInvoiceStatus(
  id: string,
  status: "PENDING" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED",
  paidDate?: string
): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  const data: Record<string, unknown> = { status };
  if (status === "PAID") {
    data.paidDate = paidDate ? new Date(paidDate) : new Date();
  }

  const invoice = await db.invoice.update({
    where: { id },
    data,
  });

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { success: true };
}

export async function updateInvoice(
  id: string,
  input: { amount?: number; gstRate?: number; dueDate?: string; invoiceNumber?: string; notes?: string }
): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  const data: Record<string, unknown> = {};
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.gstRate !== undefined) data.gstRate = input.gstRate;
  if (input.dueDate) data.dueDate = new Date(input.dueDate);
  if (input.invoiceNumber !== undefined) data.invoiceNumber = input.invoiceNumber || null;
  if (input.notes !== undefined) data.notes = input.notes || null;

  const invoice = await db.invoice.update({ where: { id }, data });

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { success: true };
}

export async function deleteInvoice(id: string): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  const invoice = await db.invoice.findUnique({ where: { id }, select: { clientId: true } });
  if (!invoice) return { success: false, error: "Invoice not found" };

  await db.invoice.delete({ where: { id } });

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { success: true };
}

// Dashboard data for Client Mandates — accessible to all authenticated users
export async function getClientMandatesDashboardData() {
  const { requireAuth } = await import("@/lib/permissions");
  await requireAuth();

  const [clients, departments, teams, teamMembers] = await Promise.all([
    db.client.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        mandates: true,
        industry: true,
        sentimentStatus: true,
        performanceSentiment: true,
        creativeSentiment: true,
        avgBillingAmount: true,
        oneTimeProjectAmount: true,
        createdAt: true,
        primaryPerformanceOwner: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
        secondaryPerformanceOwner: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
        creativeStrategyOwner: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.team.findMany({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.teamMember.findMany({
      select: {
        userId: true,
        role: true,
        team: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return { clients, departments, teams, teamMembers };
}

// Get active users for owner assignment dropdowns
export async function getClientOwnerCandidates() {
  await requireRole("OPERATOR");

  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// Revenue forecasting
export async function getRevenueForecasting() {
  await requireRole("OPERATOR");

  const clients = await db.client.findMany({
    where: {
      status: "ACTIVE",
      sentimentStatus: { not: "CHURNED" },
    },
    select: {
      id: true,
      name: true,
      avgBillingAmount: true,
      oneTimeProjectAmount: true,
      invoicingDueDay: true,
      invoices: {
        where: {
          dueDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          status: { not: "CANCELLED" },
        },
        select: { amount: true, dueDate: true, status: true },
      },
    },
  });

  return clients;
}

// Dashboard analytics
export async function getClientDashboardData() {
  await requireRole("OPERATOR");

  // All invoices for chart data (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const [allInvoices, clients] = await Promise.all([
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
      select: {
        id: true,
        name: true,
        status: true,
        sentimentStatus: true,
        performanceSentiment: true,
        creativeSentiment: true,
        avgBillingAmount: true,
        oneTimeProjectAmount: true,
        primaryPerformanceOwnerId: true,
        secondaryPerformanceOwnerId: true,
        creativeStrategyOwnerId: true,
        primaryPerformanceOwner: { select: { id: true, name: true } },
        secondaryPerformanceOwner: { select: { id: true, name: true } },
        creativeStrategyOwner: { select: { id: true, name: true } },
        _count: { select: { invoices: true, projects: true } },
      },
    }),
  ]);

  return { allInvoices, clients };
}

// Get upcoming invoice reminders
export async function getUpcomingReminders() {
  await requireRole("OPERATOR");

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return db.invoice.findMany({
    where: {
      dueDate: { gte: now, lte: thirtyDaysFromNow },
      status: { in: ["PENDING", "SENT"] },
      client: { status: "ACTIVE" },
    },
    include: {
      client: { select: { name: true, reminderDaysBefore: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}

// Partial payments
export async function addInvoicePayment(
  invoiceId: string,
  amount: number,
  note?: string
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("OPERATOR");

  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return { success: false, error: "Invoice not found" };

  const totalPaidSoFar = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const totalInvoice = invoice.amount * (1 + (invoice.gstRate || 0) / 100);
  const remaining = totalInvoice - totalPaidSoFar;

  if (amount > remaining + 0.01) {
    return { success: false, error: `Payment exceeds remaining balance of ${remaining.toFixed(2)}` };
  }

  const payment = await db.invoicePayment.create({
    data: { invoiceId, amount, note },
  });

  // Auto-mark as PAID if fully paid
  const newTotal = totalPaidSoFar + amount;
  if (newTotal >= totalInvoice - 0.01) {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidDate: new Date() },
    });
  } else if (invoice.status === "PENDING" || invoice.status === "SENT") {
    // Mark as SENT (partially paid) if it was still pending
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "SENT" },
    });
  }

  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { success: true, data: { id: payment.id } };
}

export async function deleteInvoicePayment(id: string): Promise<ActionResponse> {
  await requireRole("OPERATOR");

  const payment = await db.invoicePayment.findUnique({
    where: { id },
    include: { invoice: { include: { payments: true } } },
  });
  if (!payment) return { success: false, error: "Payment not found" };

  await db.invoicePayment.delete({ where: { id } });

  // Recalculate status
  const remainingPayments = payment.invoice.payments.filter((p) => p.id !== id);
  const totalPaid = remainingPayments.reduce((s, p) => s + p.amount, 0);
  const totalInvoice = payment.invoice.amount * (1 + (payment.invoice.gstRate || 0) / 100);

  if (totalPaid >= totalInvoice - 0.01) {
    // Still fully paid
  } else if (totalPaid > 0) {
    await db.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: "SENT", paidDate: null },
    });
  } else {
    await db.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: "PENDING", paidDate: null },
    });
  }

  revalidatePath(`/admin/clients/${payment.invoice.clientId}`);
  return { success: true };
}
