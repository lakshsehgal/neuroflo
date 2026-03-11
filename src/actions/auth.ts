"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import type { ActionResponse } from "@/types";

const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8),
});

export async function acceptInvite(
  input: z.infer<typeof acceptInviteSchema>
): Promise<ActionResponse> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  const { token, name, password } = parsed.data;

  const invite = await db.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    return { success: false, error: "Invalid invite token" };
  }

  if (invite.acceptedAt) {
    return { success: false, error: "Invite already accepted" };
  }

  if (new Date() > invite.expiresAt) {
    return { success: false, error: "Invite has expired" };
  }

  const existingUser = await db.user.findUnique({
    where: { email: invite.email },
  });

  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.$transaction([
    db.user.create({
      data: {
        name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        departmentId: invite.departmentId,
      },
    }),
    db.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return { success: true };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ActionResponse> {
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
