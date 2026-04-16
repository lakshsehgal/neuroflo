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

  const now = new Date();

  const [
    totalTasks,
    doneTasks,
    overdueTasks,
    urgentTasks,
    blockedTasks,
    statusGroups,
    priorityGroups,
    teamStatusGroups,
    assigneeStatusGroups,
  ] = await Promise.all([
    db.teamTask.count(),
    db.teamTask.count({ where: { status: "DONE" } }),
    db.teamTask.count({ where: { dueDate: { lt: now }, status: { not: "DONE" } } }),
    db.teamTask.count({ where: { priority: "URGENT" } }),
    db.teamTask.count({ where: { status: "BLOCKED" } }),
    db.teamTask.groupBy({ by: ["status"], _count: { _all: true } }),
    db.teamTask.groupBy({ by: ["priority"], _count: { _all: true } }),
    db.teamTask.groupBy({ by: ["teamId", "status"], _count: { _all: true } }),
    db.teamTask.groupBy({
      by: ["assigneeId", "status"],
      where: { assigneeId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  // Fetch team and assignee info
  const teamIds = [...new Set(teamStatusGroups.map((g) => g.teamId))];
  const assigneeIds = [...new Set(assigneeStatusGroups.map((g) => g.assigneeId!))];

  const [teams, assignees, overdueByTeam, overdueByAssignee] = await Promise.all([
    teamIds.length > 0
      ? db.team.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true, department: { select: { name: true } } },
        })
      : [],
    assigneeIds.length > 0
      ? db.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true, avatar: true },
        })
      : [],
    db.teamTask.groupBy({
      by: ["teamId"],
      where: { dueDate: { lt: now }, status: { not: "DONE" } },
      _count: { _all: true },
    }),
    assigneeIds.length > 0
      ? db.teamTask.groupBy({
          by: ["assigneeId"],
          where: { assigneeId: { in: assigneeIds }, dueDate: { lt: now }, status: { not: "DONE" } },
          _count: { _all: true },
        })
      : [],
  ]);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const userMap = new Map(assignees.map((u) => [u.id, u]));

  // Build team counts
  const teamAgg: Record<string, { name: string; dept: string; total: number; open: number; done: number; overdue: number }> = {};
  for (const row of teamStatusGroups) {
    if (!teamAgg[row.teamId]) {
      const team = teamMap.get(row.teamId);
      teamAgg[row.teamId] = { name: team?.name || "Unknown", dept: team?.department.name || "", total: 0, open: 0, done: 0, overdue: 0 };
    }
    teamAgg[row.teamId].total += row._count._all;
    if (row.status === "DONE") teamAgg[row.teamId].done += row._count._all;
    else teamAgg[row.teamId].open += row._count._all;
  }
  for (const row of overdueByTeam) {
    if (teamAgg[row.teamId]) teamAgg[row.teamId].overdue = row._count._all;
  }

  // Build assignee workload
  const assigneeAgg: Record<string, { id: string; name: string; avatar: string | null; total: number; open: number; done: number; overdue: number }> = {};
  for (const row of assigneeStatusGroups) {
    const uid = row.assigneeId!;
    if (!assigneeAgg[uid]) {
      const user = userMap.get(uid);
      assigneeAgg[uid] = { id: uid, name: user?.name || "Unknown", avatar: user?.avatar || null, total: 0, open: 0, done: 0, overdue: 0 };
    }
    assigneeAgg[uid].total += row._count._all;
    if (row.status === "DONE") assigneeAgg[uid].done += row._count._all;
    else assigneeAgg[uid].open += row._count._all;
  }
  for (const row of overdueByAssignee) {
    if (row.assigneeId && assigneeAgg[row.assigneeId]) assigneeAgg[row.assigneeId].overdue = row._count._all;
  }

  const openTasks = totalTasks - doneTasks;

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
    statusCounts: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    priorityCounts: priorityGroups.map((g) => ({ priority: g.priority, count: g._count._all })),
    teamCounts: Object.values(teamAgg),
    assigneeWorkload: Object.values(assigneeAgg).sort((a, b) => b.open - a.open),
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
