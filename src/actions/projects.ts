"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { ProjectStatus } from "@prisma/client";

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  clientId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function createProject(
  input: z.infer<typeof projectSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MEMBER");

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const project = await db.project.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      members: {
        create: { userId: user.id, role: "LEAD" },
      },
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATED",
      entityType: "PROJECT",
      entityId: project.id,
      metadata: { name: project.name },
    },
  });

  revalidatePath("/projects");
  return { success: true, data: { id: project.id } };
}

export async function getProjects(status?: ProjectStatus) {
  await requireAuth();

  return db.project.findMany({
    where: status ? { status } : undefined,
    include: {
      client: { select: { name: true } },
      department: { select: { name: true } },
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      _count: { select: { tasks: true, tickets: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(id: string) {
  await requireAuth();

  return db.project.findUnique({
    where: { id },
    include: {
      client: true,
      department: true,
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true } } } },
      tasks: {
        where: { parentId: null },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          labels: true,
          _count: { select: { subtasks: true, checklistItems: true, comments: true } },
          checklistItems: { select: { completed: true } },
          subtasks: { select: { id: true, status: true } },
        },
        orderBy: { order: "asc" },
      },
      labels: true,
    },
  });
}

export async function updateProject(
  id: string,
  input: Partial<z.infer<typeof projectSchema>>
): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.project.update({
    where: { id },
    data: {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
  });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProject(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.project.delete({ where: { id } });

  revalidatePath("/projects");
  return { success: true };
}
