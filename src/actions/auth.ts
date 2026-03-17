"use server";

import * as bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { createSessionToken, setSessionCookie, deleteSessionCookie } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import type { ActionResponse } from "@/types";

export async function login(
  email: string,
  password: string
): Promise<{ error?: string }> {
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return { error: "Invalid email or password" };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return { error: "Invalid email or password" };
    }

    const token = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.avatar,
    });

    await setSessionCookie(token);
    return {};
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function logout(): Promise<void> {
  await deleteSessionCookie();
}

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

export async function requestPasswordReset(email: string): Promise<ActionResponse> {
  const validated = z.string().email().safeParse(email);
  if (!validated.success) {
    return { success: false, error: "Invalid email" };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Always return success to prevent email enumeration
  if (!user || !user.isActive) {
    return { success: true };
  }

  // Invalidate any existing unused reset tokens for this email
  await db.passwordReset.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  const reset = await db.passwordReset.create({
    data: { email, expiresAt },
  });

  try {
    await sendPasswordResetEmail({ to: email, resetToken: reset.token });
  } catch {
    // Still return success to prevent enumeration
  }

  return { success: true };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ActionResponse> {
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const reset = await db.passwordReset.findUnique({ where: { token } });
  if (!reset) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  if (reset.usedAt) {
    return { success: false, error: "This reset link has already been used" };
  }

  if (new Date() > reset.expiresAt) {
    return { success: false, error: "This reset link has expired" };
  }

  const user = await db.user.findUnique({ where: { email: reset.email } });
  if (!user) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    db.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true };
}
