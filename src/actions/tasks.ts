"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { TaskStatus } from "@prisma/client";
import {
  notifyTaskAssigned,
  notifyTaskComment,
} from "@/actions/notifications";
import { fireWorkflowTrigger } from "@/lib/workflow-engine";

const taskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["RESEARCH", "MOODBOARDING", "ANGLES", "SCRIPTING", "APPROVAL_PENDING", "CREATOR_FINALISING", "PRODUCTION", "POST_PRODUCTION", "IN_REVISION", "DELIVERED", "ON_HOLD"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  creatorName: z.string().optional(),
  workPortfolioLink: z.string().optional(),
  shootDate: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  deliveryLink: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
});

export async function createTask(
  input: z.infer<typeof taskSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MEMBER");

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const maxOrder = await db.task.findFirst({
    where: { projectId: parsed.data.projectId, status: parsed.data.status || "RESEARCH" },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await db.task.create({
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      shootDate: parsed.data.shootDate ? new Date(parsed.data.shootDate) : undefined,
      estimatedDeliveryDate: parsed.data.estimatedDeliveryDate ? new Date(parsed.data.estimatedDeliveryDate) : undefined,
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

  // Notify assignee
  if (parsed.data.assigneeId && parsed.data.assigneeId !== user.id) {
    notifyTaskAssigned(task.id, task.title, task.projectId, parsed.data.assigneeId, user.name).catch(console.error);
  }

  fireWorkflowTrigger({
    triggerType: "task_created",
    entityId: task.id,
    entityTitle: task.title,
    actorName: user.name,
    status: task.status,
    priority: task.priority,
  }).catch(console.error);

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { success: true, data: { id: task.id } };
}

export async function updateTask(
  id: string,
  input: Partial<z.infer<typeof taskSchema>>
): Promise<ActionResponse> {
  const user = await requireRole("MEMBER");

  const oldTask = await db.task.findUnique({
    where: { id },
    select: { assigneeId: true, title: true, projectId: true },
  });

  await db.task.update({
    where: { id },
    data: {
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      shootDate: input.shootDate ? new Date(input.shootDate) : undefined,
      estimatedDeliveryDate: input.estimatedDeliveryDate ? new Date(input.estimatedDeliveryDate) : undefined,
    },
  });

  // Notify new assignee if changed
  if (
    input.assigneeId &&
    input.assigneeId !== oldTask?.assigneeId &&
    input.assigneeId !== user.id
  ) {
    notifyTaskAssigned(
      id,
      oldTask?.title || "Untitled",
      oldTask?.projectId || input.projectId || "",
      input.assigneeId,
      user.name
    ).catch(console.error);

    fireWorkflowTrigger({
      triggerType: "task_assigned",
      entityId: id,
      entityTitle: oldTask?.title || "Untitled",
      actorName: user.name,
    }).catch(console.error);
  }

  const projectId = input.projectId || oldTask?.projectId;
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
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
        data: { status: t.status as TaskStatus, order: t.order },
      })
    )
  );

  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  const task = await db.task.findUnique({ where: { id } });
  if (!task) return { success: false, error: "Task not found" };

  await db.task.delete({ where: { id } });

  revalidatePath(`/projects/${task.projectId}`);
  return { success: true };
}

export async function getTaskDetail(taskId: string) {
  await requireAuth();

  return db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      labels: true,
      comments: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
      subtasks: {
        include: { assignee: { select: { id: true, name: true, avatar: true } } },
        orderBy: { order: "asc" },
      },
      checklistItems: {
        orderBy: { order: "asc" },
      },
      revisions: {
        include: { feedbacks: { orderBy: { createdAt: "asc" } } },
        orderBy: { version: "desc" },
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
      },
      project: { select: { id: true, name: true } },
    },
  });
}

export async function createSubtask(
  parentId: string,
  projectId: string,
  title: string
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("MEMBER");

  const maxOrder = await db.task.findFirst({
    where: { parentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await db.task.create({
    data: {
      title,
      projectId,
      parentId,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data: { id: task.id } };
}

export async function createChecklistItem(
  taskId: string,
  title: string
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("MEMBER");

  const maxOrder = await db.checklistItem.findFirst({
    where: { taskId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const item = await db.checklistItem.create({
    data: {
      taskId,
      title,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
  return { success: true, data: { id: item.id } };
}

export async function toggleChecklistItem(
  id: string,
  completed: boolean
): Promise<ActionResponse> {
  await requireRole("MEMBER");

  const item = await db.checklistItem.update({
    where: { id },
    data: { completed },
    include: { task: true },
  });

  revalidatePath(`/projects/${item.task.projectId}`);
  return { success: true };
}

export async function deleteChecklistItem(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  const item = await db.checklistItem.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!item) return { success: false, error: "Not found" };

  await db.checklistItem.delete({ where: { id } });

  revalidatePath(`/projects/${item.task.projectId}`);
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
    if (task) {
      revalidatePath(`/projects/${task.projectId}`);
      // Notify task assignee about the comment
      const recipientIds = [task.assigneeId].filter(Boolean) as string[];
      if (recipientIds.length > 0) {
        notifyTaskComment(taskId, task.title, task.projectId, user.name, recipientIds, user.id).catch(console.error);
      }
    }
  }
  if (ticketId) {
    revalidatePath(`/tickets/${ticketId}`);
  }

  return { success: true };
}

// ─── Task Revision & Feedback ────────────────────────

export async function createTaskRevision(
  taskId: string,
  videoUrl: string,
  note?: string
): Promise<ActionResponse<{ id: string }>> {
  await requireRole("MEMBER");

  const maxVersion = await db.taskRevision.findFirst({
    where: { taskId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const revision = await db.taskRevision.create({
    data: {
      taskId,
      version: (maxVersion?.version ?? 0) + 1,
      videoUrl,
      note,
    },
  });

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
  return { success: true, data: { id: revision.id } };
}

export async function addTaskFeedback(
  taskId: string,
  content: string,
  authorName: string,
  isClient: boolean,
  revisionId?: string
): Promise<ActionResponse<{ id: string }>> {
  // No auth required for client feedback (guest portal)
  const feedback = await db.taskFeedback.create({
    data: {
      taskId,
      revisionId: revisionId || null,
      content,
      authorName,
      isClient,
    },
  });

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
  return { success: true, data: { id: feedback.id } };
}

export async function resolveTaskFeedback(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.taskFeedback.update({
    where: { id },
    data: { status: "RESOLVED" },
  });

  return { success: true };
}

export async function getTaskRevisions(taskId: string) {
  return db.taskRevision.findMany({
    where: { taskId },
    include: { feedbacks: { orderBy: { createdAt: "asc" } } },
    orderBy: { version: "desc" },
  });
}

// Guest access: get task details for feedback (no auth)
export async function getGuestTaskDetail(taskId: string, token: string) {
  const access = await db.guestAccess.findUnique({
    where: { token },
    select: { projectId: true, isActive: true, expiresAt: true, name: true },
  });

  if (!access || !access.isActive) return null;
  if (access.expiresAt && access.expiresAt < new Date()) return null;

  const task = await db.task.findUnique({
    where: { id: taskId, projectId: access.projectId },
    include: {
      revisions: {
        include: { feedbacks: { orderBy: { createdAt: "asc" } } },
        orderBy: { version: "desc" },
      },
      feedbacks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) return null;
  return { task, guestName: access.name };
}
