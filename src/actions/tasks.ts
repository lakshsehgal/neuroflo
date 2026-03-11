"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

const taskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createTask(
  input: z.infer<typeof taskSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MEMBER");

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const maxOrder = await db.task.findFirst({
    where: { projectId: parsed.data.projectId, status: parsed.data.status || "TODO" },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await db.task.create({
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATED",
      entityType: "TASK",
      entityId: task.id,
      metadata: { title: task.title, projectId: task.projectId },
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { success: true, data: { id: task.id } };
}

export async function updateTask(
  id: string,
  input: Partial<z.infer<typeof taskSchema>>
): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.task.update({
    where: { id },
    data: {
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
  });

  if (input.projectId) {
    revalidatePath(`/projects/${input.projectId}`);
  }
  return { success: true };
}

export async function updateTaskOrder(
  tasks: { id: string; status: string; order: number }[]
): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.$transaction(
    tasks.map((t) =>
      db.task.update({
        where: { id: t.id },
        data: { status: t.status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE", order: t.order },
      })
    )
  );

  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResponse> {
  await requireRole("MANAGER");

  const task = await db.task.findUnique({ where: { id } });
  if (!task) return { success: false, error: "Task not found" };

  await db.task.delete({ where: { id } });

  revalidatePath(`/projects/${task.projectId}`);
  return { success: true };
}

export async function addComment(
  content: string,
  taskId?: string,
  ticketId?: string
): Promise<ActionResponse> {
  const user = await requireAuth();

  if (!taskId && !ticketId) {
    return { success: false, error: "Must specify a task or ticket" };
  }

  await db.comment.create({
    data: { content, authorId: user.id, taskId, ticketId },
  });

  if (taskId) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (task) revalidatePath(`/projects/${task.projectId}`);
  }
  if (ticketId) {
    revalidatePath(`/tickets/${ticketId}`);
  }

  return { success: true };
}
