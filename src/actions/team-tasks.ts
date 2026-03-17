"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { TeamTaskStatus } from "@prisma/client";

const teamTaskSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z
    .enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "ON_HOLD"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createTeamTask(
  input: z.infer<typeof teamTaskSchema>
): Promise<ActionResponse<{
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  teamId: string;
  teamName: string;
  departmentName: string;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  createdByName: string | null;
  commentCount: number;
}>> {
  const user = await requireRole("MEMBER");

  const parsed = teamTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const maxOrder = await db.teamTask.findFirst({
    where: {
      teamId: parsed.data.teamId,
      status: parsed.data.status || "TODO",
    },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const task = await db.teamTask.create({
    data: {
      ...parsed.data,
      createdById: user.id,
      dueDate: parsed.data.dueDate
        ? new Date(parsed.data.dueDate)
        : undefined,
      order: (maxOrder?.order ?? -1) + 1,
    },
    include: {
      team: { include: { department: true } },
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATED",
      entityType: "TEAM_TASK",
      entityId: task.id,
      metadata: { title: task.title, teamId: task.teamId },
    },
  });

  revalidatePath("/team-tasks");
  return {
    success: true,
    data: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      teamId: task.teamId,
      teamName: task.team.name,
      departmentName: task.team.department.name,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      assigneeId: task.assignee?.id || null,
      assigneeName: task.assignee?.name || null,
      assigneeInitials: task.assignee
        ? task.assignee.name.split(" ").map((n: string) => n[0]).join("")
        : null,
      createdByName: task.createdBy?.name || null,
      commentCount: task._count.comments,
    },
  };
}

export async function updateTeamTask(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResponse> {
  await requireRole("MEMBER");

  const data: Record<string, unknown> = { ...input };
  if (data.dueDate && typeof data.dueDate === "string") {
    data.dueDate = new Date(data.dueDate as string);
  }

  await db.teamTask.update({ where: { id }, data });

  revalidatePath("/team-tasks");
  return { success: true };
}

export async function updateTeamTaskStatus(
  id: string,
  status: TeamTaskStatus
): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.teamTask.update({ where: { id }, data: { status } });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "STATUS_CHANGED",
      entityType: "TEAM_TASK",
      entityId: id,
      metadata: { to: status },
    },
  });

  revalidatePath("/team-tasks");
  return { success: true };
}

export async function updateTeamTaskOrder(
  tasks: { id: string; status: string; order: number }[]
): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.$transaction(
    tasks.map((t) =>
      db.teamTask.update({
        where: { id: t.id },
        data: { status: t.status as TeamTaskStatus, order: t.order },
      })
    )
  );

  return { success: true };
}

export async function deleteTeamTask(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.teamTask.delete({ where: { id } });
  revalidatePath("/team-tasks");
  return { success: true };
}

export async function getTeamTasks() {
  await requireAuth();

  return db.teamTask.findMany({
    include: {
      team: {
        include: { department: { select: { name: true } } },
      },
      assignee: { select: { id: true, name: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ team: { name: "asc" } }, { order: "asc" }],
  });
}

export async function getTeamsWithDepartments() {
  await requireAuth();

  return db.team.findMany({
    include: {
      department: { select: { id: true, name: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { role: "asc" },
      },
      _count: { select: { members: true, teamTasks: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getTeamTaskWorkloadData() {
  await requireAuth();

  return db.teamTask.findMany({
    where: { status: { notIn: ["DONE"] } },
    select: {
      id: true,
      status: true,
      dueDate: true,
      teamId: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, avatar: true } },
      team: { select: { name: true } },
    },
  });
}

export async function getTeamTaskAnalytics() {
  await requireAuth();

  const tasks = await db.teamTask.findMany({
    include: {
      team: { include: { department: { select: { name: true } } } },
      assignee: { select: { id: true, name: true, avatar: true } },
    },
  });

  const now = new Date();

  const totalTasks = tasks.length;
  const openTasks = tasks.filter((t) => t.status !== "DONE").length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.status !== "DONE"
  ).length;
  const urgentTasks = tasks.filter((t) => t.priority === "URGENT").length;
  const blockedTasks = tasks.filter((t) => t.status === "BLOCKED").length;

  // Status counts
  const statusMap = new Map<string, number>();
  tasks.forEach((t) => statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1));
  const statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // Priority counts
  const priorityMap = new Map<string, number>();
  tasks.forEach((t) =>
    priorityMap.set(t.priority, (priorityMap.get(t.priority) || 0) + 1)
  );
  const priorityCounts = Array.from(priorityMap.entries()).map(
    ([priority, count]) => ({ priority, count })
  );

  // Team counts
  const teamMap = new Map<string, { name: string; dept: string; total: number; open: number; done: number; overdue: number }>();
  tasks.forEach((t) => {
    const key = t.teamId;
    const existing = teamMap.get(key) || {
      name: t.team.name,
      dept: t.team.department.name,
      total: 0,
      open: 0,
      done: 0,
      overdue: 0,
    };
    existing.total++;
    if (t.status !== "DONE") existing.open++;
    if (t.status === "DONE") existing.done++;
    if (t.dueDate && t.dueDate < now && t.status !== "DONE") existing.overdue++;
    teamMap.set(key, existing);
  });
  const teamCounts = Array.from(teamMap.values());

  // Assignee workload
  const assigneeMap = new Map<
    string,
    { id: string; name: string; avatar: string | null; total: number; open: number; done: number; overdue: number }
  >();
  tasks.forEach((t) => {
    if (!t.assignee) return;
    const key = t.assignee.id;
    const existing = assigneeMap.get(key) || {
      id: t.assignee.id,
      name: t.assignee.name,
      avatar: t.assignee.avatar,
      total: 0,
      open: 0,
      done: 0,
      overdue: 0,
    };
    existing.total++;
    if (t.status !== "DONE") existing.open++;
    if (t.status === "DONE") existing.done++;
    if (t.dueDate && t.dueDate < now && t.status !== "DONE") existing.overdue++;
    assigneeMap.set(key, existing);
  });
  const assigneeWorkload = Array.from(assigneeMap.values()).sort(
    (a, b) => b.open - a.open
  );

  return {
    summary: {
      totalTasks,
      openTasks,
      doneTasks,
      overdueTasks,
      urgentTasks,
      blockedTasks,
      completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    },
    statusCounts,
    priorityCounts,
    teamCounts,
    assigneeWorkload,
  };
}

export async function getCurrentUserTeamIds(): Promise<string[]> {
  const user = await requireAuth();

  const memberships = await db.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });

  return memberships.map((m) => m.teamId);
}

// ─── Team Management ──────────────────────────────────

export async function createTeam(
  name: string,
  departmentId: string
): Promise<ActionResponse> {
  await requireRole("ADMIN");

  if (!name || name.length < 2) {
    return { success: false, error: "Team name must be at least 2 characters" };
  }

  await db.team.create({ data: { name, departmentId } });
  revalidatePath("/team-tasks");
  revalidatePath("/settings/departments");
  return { success: true };
}

export async function deleteTeam(id: string): Promise<ActionResponse> {
  await requireRole("ADMIN");

  const team = await db.team.findUnique({
    where: { id },
    include: { _count: { select: { teamTasks: true } } },
  });

  if (!team) return { success: false, error: "Team not found" };

  await db.team.delete({ where: { id } });
  revalidatePath("/team-tasks");
  return { success: true };
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: string = "MEMBER"
): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.teamMember.create({ data: { teamId, userId, role } });
  revalidatePath("/team-tasks");
  return { success: true };
}

export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.teamMember.deleteMany({ where: { teamId, userId } });
  revalidatePath("/team-tasks");
  return { success: true };
}

export async function addTeamTaskComment(
  teamTaskId: string,
  content: string
): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.comment.create({
    data: { content, authorId: user.id, teamTaskId },
  });

  revalidatePath("/team-tasks");
  return { success: true };
}
