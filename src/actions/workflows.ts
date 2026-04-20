"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { Prisma } from "@prisma/client";

const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.string().min(1),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionType: z.string().min(1),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
});

export async function getWorkflows() {
  await requireAuth();
  return db.workflow.findMany({
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWorkflow(id: string) {
  await requireAuth();
  return db.workflow.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createWorkflow(
  input: z.infer<typeof workflowSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MANAGER");

  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const workflow = await db.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      triggerType: parsed.data.triggerType,
      triggerConfig: (parsed.data.triggerConfig || {}) as Prisma.InputJsonValue,
      actionType: parsed.data.actionType,
      actionConfig: (parsed.data.actionConfig || {}) as Prisma.InputJsonValue,
      createdById: user.id,
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATED",
      entityType: "WORKFLOW",
      entityId: workflow.id,
      metadata: { name: workflow.name },
    },
  });

  revalidatePath("/workflows");
  return { success: true, data: { id: workflow.id } };
}

export async function updateWorkflow(
  id: string,
  input: Partial<z.infer<typeof workflowSchema>> & { enabled?: boolean }
): Promise<ActionResponse> {
  await requireRole("MANAGER");

  const data: Record<string, unknown> = { ...input };
  if (data.triggerConfig) data.triggerConfig = data.triggerConfig as Prisma.InputJsonValue;
  if (data.actionConfig) data.actionConfig = data.actionConfig as Prisma.InputJsonValue;

  await db.workflow.update({ where: { id }, data });

  revalidatePath("/workflows");
  return { success: true };
}

export async function deleteWorkflow(id: string): Promise<ActionResponse> {
  const user = await requireRole("MANAGER");

  await db.workflow.delete({ where: { id } });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "DELETED",
      entityType: "WORKFLOW",
      entityId: id,
    },
  });

  revalidatePath("/workflows");
  return { success: true };
}

export async function getWorkflowLogs(workflowId: string) {
  await requireAuth();
  return db.workflowLog.findMany({
    where: { workflowId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
