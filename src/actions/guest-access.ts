"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

const guestAccessSchema = z.object({
  projectId: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function createGuestAccess(
  input: z.infer<typeof guestAccessSchema>
): Promise<ActionResponse<{ token: string }>> {
  await requireRole("MEMBER");

  const parsed = guestAccessSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const project = await db.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { clientId: true },
  });
  if (!project) return { success: false, error: "Project not found" };

  const guestAccess = await db.guestAccess.create({
    data: {
      projectId: parsed.data.projectId,
      clientId: project.clientId,
      email: parsed.data.email,
      name: parsed.data.name,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  return { success: true, data: { token: guestAccess.token } };
}

export async function revokeGuestAccess(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  const access = await db.guestAccess.findUnique({ where: { id } });
  if (!access) return { success: false, error: "Not found" };

  await db.guestAccess.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath(`/projects/${access.projectId}`);
  return { success: true };
}

export async function getGuestProject(token: string) {
  const access = await db.guestAccess.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          client: { select: { name: true } },
          tasks: {
            where: { parentId: null },
            include: {
              assignee: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!access || !access.isActive) return null;
  if (access.expiresAt && access.expiresAt < new Date()) return null;

  return access;
}
