"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";

export async function getProfile() {
  const user = await requireAuth();

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      position: true,
      bio: true,
      role: true,
      department: { select: { name: true } },
      createdAt: true,
    },
  });

  return profile;
}

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  position: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResponse> {
  const user = await requireAuth();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      position: parsed.data.position || null,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath("/settings/profile");
  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResponse> {
  const user = await requireAuth();

  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { success: false, error: "User not found" };

  const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!isValid) return { success: false, error: "Current password is incorrect" };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true };
}

export async function updateAvatar(avatarUrl: string): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.user.update({
    where: { id: user.id },
    data: { avatar: avatarUrl },
  });

  revalidatePath("/settings/profile");
  return { success: true };
}
