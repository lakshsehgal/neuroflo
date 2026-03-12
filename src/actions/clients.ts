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
  sentimentStatus: z.enum(["HAPPY", "NEUTRAL", "AT_RISK", "CHURNED"]).optional(),
  avgBillingAmount: z.number().optional().nullable(),
  decidedCommercials: z.string().optional(),
  invoicingDueDay: z.number().optional().nullable(),
  reminderDaysBefore: z.number().optional(),
});

export async function createClient(
  input: z.infer<typeof clientSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("ADMIN");

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const client = await db.client.create({ data: parsed.data });

  revalidatePath("/admin/clients");
  return { success: true, data: { id: client.id } };
}

export async function updateClient(
  id: string,
  input: z.infer<typeof clientSchema>
): Promise<ActionResponse> {
  await requireRole("ADMIN");

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  await db.client.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { success: true };
}

export async function getClients() {
  await requireRole("ADMIN");

  return db.client.findMany({
    include: {
      _count: { select: { projects: true, invoices: true } },
      invoices: {
        where: { status: { in: ["PENDING", "SENT", "OVERDUE"] } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getClient(id: string) {
  await requireRole("ADMIN");

  return db.client.findUnique({
    where: { id },
    include: {
      projects: { select: { id: true, name: true, status: true } },
      invoices: { orderBy: { dueDate: "desc" } },
    },
  });
}

export async function deleteClient(id: string): Promise<ActionResponse> {
  await requireRole("ADMIN");
  await db.client.delete({ where: { id } });
  revalidatePath("/admin/clients");
  return { success: true };
}

// Invoice actions
const invoiceSchema = z.object({
  clientId: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function createInvoice(
  input: z.infer<typeof invoiceSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("ADMIN");

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const invoice = await db.invoice.create({
    data: {
      ...parsed.data,
      dueDate: new Date(parsed.data.dueDate),
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
  await requireRole("ADMIN");

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

// Revenue forecasting
export async function getRevenueForecasting() {
  await requireRole("ADMIN");

  const clients = await db.client.findMany({
    where: { sentimentStatus: { not: "CHURNED" } },
    select: {
      id: true,
      name: true,
      avgBillingAmount: true,
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

// Get upcoming invoice reminders
export async function getUpcomingReminders() {
  await requireRole("ADMIN");

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return db.invoice.findMany({
    where: {
      dueDate: { gte: now, lte: thirtyDaysFromNow },
      status: { in: ["PENDING", "SENT"] },
    },
    include: {
      client: { select: { name: true, reminderDaysBefore: true } },
    },
    orderBy: { dueDate: "asc" },
  });
}
