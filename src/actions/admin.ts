"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import type { ActionResponse } from "@/types";
import type { Role } from "@prisma/client";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]),
  departmentId: z.string().optional(),
});

export async function inviteUser(input: z.infer<typeof inviteSchema>): Promise<ActionResponse> {
  await requireRole("ADMIN");

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  const { email, role, departmentId } = parsed.data;

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { success: false, error: "User with this email already exists" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

  const invite = await db.invite.create({
    data: {
      email,
      role: role as Role,
      departmentId,
      expiresAt,
    },
  });

  // TODO: Send invite email with link: /accept-invite?token={invite.token}
  console.log(`Invite link: /accept-invite?token=${invite.token}`);

  return { success: true };
}

export async function getTeamMembers() {
  await requireRole("MANAGER");

  return db.user.findMany({
    where: { isActive: true },
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingInvites() {
  await requireRole("ADMIN");

  return db.invite.findMany({
    where: { acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUserRole(
  userId: string,
  role: Role
): Promise<ActionResponse> {
  await requireRole("ADMIN");

  await db.user.update({
    where: { id: userId },
    data: { role },
  });

  return { success: true };
}

export async function deactivateUser(userId: string): Promise<ActionResponse> {
  await requireRole("ADMIN");

  await db.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  return { success: true };
}

export async function createDepartment(name: string): Promise<ActionResponse> {
  await requireRole("ADMIN");

  if (!name || name.length < 2) {
    return { success: false, error: "Department name must be at least 2 characters" };
  }

  await db.department.create({ data: { name } });
  return { success: true };
}

export async function getDepartments() {
  return db.department.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
}

export async function cancelInvite(inviteId: string): Promise<ActionResponse> {
  await requireRole("ADMIN");

  const invite = await db.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return { success: false, error: "Invite not found" };
  if (invite.acceptedAt) return { success: false, error: "Invite already accepted" };

  await db.invite.delete({ where: { id: inviteId } });
  return { success: true };
}

export async function deleteDepartment(id: string): Promise<ActionResponse> {
  await requireRole("ADMIN");

  const dept = await db.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!dept) return { success: false, error: "Department not found" };
  if (dept._count.users > 0) {
    return { success: false, error: "Cannot delete department with active members" };
  }

  await db.department.delete({ where: { id } });
  return { success: true };
}
