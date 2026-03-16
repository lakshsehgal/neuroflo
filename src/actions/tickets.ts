"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { TicketStatus } from "@prisma/client";
import {
  notifyTicketAssigned,
  notifyTicketComment,
  notifyTicketStatusChanged,
} from "@/actions/notifications";

const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  format: z.enum(["STATIC", "VIDEO", "UGC", "GIF", "CAROUSEL", "DPA_FRAME"]).optional().nullable(),
  creativeType: z.enum(["NET_NEW", "ITERATION"]).optional().nullable(),
  clientName: z.string().optional(),
  creativeBriefUrl: z.string().optional(),
  deliveryLink: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createTicket(
  input: z.infer<typeof ticketSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MEMBER");

  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const ticket = await db.ticket.create({
    data: {
      ...parsed.data,
      creatorId: user.id,
      assignedById: user.id,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATED",
      entityType: "TICKET",
      entityId: ticket.id,
      metadata: { title: ticket.title },
    },
  });

  // Notify assignee
  if (parsed.data.assigneeId && parsed.data.assigneeId !== user.id) {
    notifyTicketAssigned(ticket.id, ticket.title, parsed.data.assigneeId, user.name).catch(console.error);
  }

  revalidatePath("/tickets");
  return { success: true, data: { id: ticket.id } };
}

export async function updateTicket(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResponse> {
  const user = await requireRole("MEMBER");

  // Check if assignee is changing
  const oldTicket = await db.ticket.findUnique({
    where: { id },
    select: { assigneeId: true, title: true },
  });

  const data: Record<string, unknown> = { ...input };
  if (data.dueDate && typeof data.dueDate === "string") {
    data.dueDate = new Date(data.dueDate as string);
  }

  await db.ticket.update({ where: { id }, data });

  // Notify new assignee if changed
  if (
    data.assigneeId &&
    data.assigneeId !== oldTicket?.assigneeId &&
    data.assigneeId !== user.id
  ) {
    notifyTicketAssigned(
      id,
      oldTicket?.title || "Untitled",
      data.assigneeId as string,
      user.name
    ).catch(console.error);
  }

  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function getTickets(status?: TicketStatus) {
  await requireAuth();

  return db.ticket.findMany({
    where: status ? { status } : undefined,
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      assignedBy: { select: { id: true, name: true } },
      _count: { select: { revisions: true, comments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTicket(id: string) {
  await requireAuth();

  return db.ticket.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true, avatar: true } },
      assignee: { select: { id: true, name: true, email: true, avatar: true } },
      assignedBy: { select: { id: true, name: true } },
      revisions: {
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { version: "desc" },
      },
      approvals: {
        include: { approver: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus
): Promise<ActionResponse> {
  const user = await requireAuth();

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { title: true, creatorId: true, assigneeId: true },
  });

  await db.ticket.update({ where: { id }, data: { status } });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "STATUS_CHANGED",
      entityType: "TICKET",
      entityId: id,
      metadata: { to: status },
    },
  });

  // Notify creator and assignee
  if (ticket) {
    const recipientIds = [ticket.creatorId, ticket.assigneeId].filter(Boolean) as string[];
    notifyTicketStatusChanged(
      id,
      ticket.title,
      status,
      user.name,
      recipientIds,
      user.id
    ).catch(console.error);
  }

  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function addTicketComment(
  ticketId: string,
  content: string
): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.comment.create({
    data: { content, authorId: user.id, ticketId },
  });

  // Notify ticket creator and assignee about the comment
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { title: true, creatorId: true, assigneeId: true },
  });

  if (ticket) {
    const recipientIds = [ticket.creatorId, ticket.assigneeId].filter(Boolean) as string[];
    notifyTicketComment(ticketId, ticket.title, user.name, recipientIds, user.id).catch(console.error);
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export async function getTeamUsers() {
  await requireAuth();
  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, avatar: true },
    orderBy: { name: "asc" },
  });
}

export async function getClientNames() {
  await requireAuth();
  return db.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function approveTicket(
  ticketId: string,
  status: "APPROVED" | "REJECTED",
  comment?: string
): Promise<ActionResponse> {
  const user = await requireRole("MEMBER");

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { title: true, creatorId: true, assigneeId: true },
  });
  if (!ticket) return { success: false, error: "Ticket not found" };

  await db.approval.create({
    data: {
      ticketId,
      approverId: user.id,
      status,
      comment: comment || null,
    },
  });

  // If approved, update ticket status
  if (status === "APPROVED") {
    await db.ticket.update({ where: { id: ticketId }, data: { status: "APPROVED" } });
  }

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: status,
      entityType: "TICKET",
      entityId: ticketId,
      metadata: { title: ticket.title, comment },
    },
  });

  // Notify creator and assignee
  const recipientIds = [ticket.creatorId, ticket.assigneeId].filter(Boolean) as string[];
  notifyTicketStatusChanged(
    ticketId,
    ticket.title,
    status === "APPROVED" ? "APPROVED" : "NEEDS_EDIT",
    user.name,
    recipientIds,
    user.id
  ).catch(console.error);

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function deleteTicket(id: string): Promise<ActionResponse> {
  await requireRole("MEMBER");

  await db.ticket.delete({ where: { id } });
  revalidatePath("/tickets");
  return { success: true };
}

export async function getTicketWorkloadData() {
  await requireAuth();

  return db.ticket.findMany({
    where: { status: { notIn: ["APPROVED"] } },
    select: {
      id: true,
      status: true,
      dueDate: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, avatar: true } },
    },
  });
}
