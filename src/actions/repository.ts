"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

// ─── Clients ────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

export async function createClient(
  input: z.infer<typeof clientSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("MANAGER");

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const client = await db.client.create({ data: parsed.data });

  revalidatePath("/repository/clients");
  return { success: true, data: { id: client.id } };
}

export async function getClients(search?: string) {
  await requireAuth();

  return db.client.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { industry: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { campaigns: true, projects: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getClient(id: string) {
  await requireAuth();

  return db.client.findUnique({
    where: { id },
    include: {
      campaigns: {
        include: { _count: { select: { metrics: true } } },
        orderBy: { createdAt: "desc" },
      },
      projects: {
        select: { id: true, name: true, status: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function updateClient(
  id: string,
  input: Partial<z.infer<typeof clientSchema>>
): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.client.update({ where: { id }, data: input });
  revalidatePath(`/repository/clients/${id}`);
  revalidatePath("/repository/clients");
  return { success: true };
}

export async function deleteClient(id: string): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.client.delete({ where: { id } });
  revalidatePath("/repository/clients");
  return { success: true };
}

// ─── Campaigns ──────────────────────────────────────────

const campaignSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  platform: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
});

export async function createCampaign(
  input: z.infer<typeof campaignSchema>
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("MANAGER");

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const campaign = await db.campaign.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  });

  revalidatePath("/repository/campaigns");
  return { success: true, data: { id: campaign.id } };
}

export async function getCampaigns(clientId?: string) {
  await requireAuth();

  return db.campaign.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { name: true } },
      _count: { select: { metrics: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(id: string) {
  await requireAuth();

  return db.campaign.findUnique({
    where: { id },
    include: {
      client: true,
      metrics: { orderBy: { date: "desc" } },
    },
  });
}

export async function addCampaignMetrics(
  campaignId: string,
  metrics: { name: string; value: number; date: string }[]
): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.campaignMetric.createMany({
    data: metrics.map((m) => ({
      campaignId,
      name: m.name,
      value: m.value,
      date: new Date(m.date),
    })),
  });

  revalidatePath(`/repository/campaigns/${campaignId}`);
  return { success: true };
}

// ─── Reports ────────────────────────────────────────────

export async function getReportData(clientId?: string, startDate?: string, endDate?: string) {
  await requireAuth();

  const where: Record<string, unknown> = {};
  if (clientId) {
    where.campaign = { clientId };
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
  }

  const metrics = await db.campaignMetric.findMany({
    where,
    include: { campaign: { include: { client: { select: { name: true } } } } },
    orderBy: { date: "asc" },
  });

  return metrics;
}
