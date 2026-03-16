"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import { notifyProjectMemberAdded } from "@/actions/notifications";

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
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

export async function getProjects() {
  await requireAuth();

  return db.project.findMany({
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
  await requireRole("MANAGER");

  await db.project.delete({ where: { id } });

  revalidatePath("/projects");
  return { success: true };
}

// ─── Project Member Management ──────────────────────────

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string = "MEMBER"
): Promise<ActionResponse> {
  const user = await requireRole("MEMBER");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { name: true, members: { where: { userId: user.id } } },
  });
  if (!project) return { success: false, error: "Project not found" };

  // Only project leads, managers, or admins can add members
  const isLead = project.members.some((m) => m.role === "LEAD");
  if (!isLead && !["ADMIN", "MANAGER"].includes(user.role)) {
    return { success: false, error: "Only project leads or managers can add members" };
  }

  const existing = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) return { success: false, error: "User is already a member" };

  await db.projectMember.create({
    data: { projectId, userId, role },
  });

  // Notify the added member
  if (userId !== user.id) {
    notifyProjectMemberAdded(projectId, project.name, userId, user.name).catch(console.error);
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<ActionResponse> {
  const user = await requireRole("MEMBER");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { members: { where: { userId: user.id } } },
  });
  if (!project) return { success: false, error: "Project not found" };

  const isLead = project.members.some((m) => m.role === "LEAD");
  if (!isLead && !["ADMIN", "MANAGER"].includes(user.role)) {
    return { success: false, error: "Only project leads or managers can remove members" };
  }

  // Prevent removing the last lead
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) return { success: false, error: "Member not found" };

  if (member.role === "LEAD") {
    const leadCount = await db.projectMember.count({
      where: { projectId, role: "LEAD" },
    });
    if (leadCount <= 1) {
      return { success: false, error: "Cannot remove the last project lead" };
    }
  }

  await db.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: string
): Promise<ActionResponse> {
  const user = await requireRole("MEMBER");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { members: { where: { userId: user.id } } },
  });
  if (!project) return { success: false, error: "Project not found" };

  const isLead = project.members.some((m) => m.role === "LEAD");
  if (!isLead && !["ADMIN", "MANAGER"].includes(user.role)) {
    return { success: false, error: "Only project leads or managers can change roles" };
  }

  // Prevent demoting the last lead
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) return { success: false, error: "Member not found" };

  if (member.role === "LEAD" && role !== "LEAD") {
    const leadCount = await db.projectMember.count({
      where: { projectId, role: "LEAD" },
    });
    if (leadCount <= 1) {
      return { success: false, error: "Cannot demote the last project lead" };
    }
  }

  await db.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function getAvailableUsersForProject(projectId: string) {
  await requireAuth();

  const existingMembers = await db.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  const existingIds = existingMembers.map((m) => m.userId);

  return db.user.findMany({
    where: {
      isActive: true,
      id: { notIn: existingIds },
    },
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: "asc" },
  });
}
