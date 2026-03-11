"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { TicketStatus } from "@prisma/client";

const ticketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  projectId: z.string().optional(),
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

  revalidatePath("/tickets");
  return { success: true, data: { id: ticket.id } };
}

export async function getTickets(status?: TicketStatus) {
  await requireAuth();

  return db.ticket.findMany({
    where: status ? { status } : undefined,
    include: {
      creator: { select: { id: true, name: true, avatar: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      project: { select: { id: true, name: true } },
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
      project: { select: { id: true, name: true } },
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

  // Validate status transitions
  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return { success: false, error: "Ticket not found" };

  const validTransitions: Record<TicketStatus, TicketStatus[]> = {
    SUBMITTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["IN_REVIEW", "SUBMITTED"],
    IN_REVIEW: ["APPROVED", "REVISION_REQUESTED"],
    REVISION_REQUESTED: ["IN_PROGRESS"],
    APPROVED: ["COMPLETED"],
    COMPLETED: [],
  };

  if (!validTransitions[ticket.status].includes(status)) {
    return { success: false, error: `Cannot transition from ${ticket.status} to ${status}` };
  }

  await db.ticket.update({ where: { id }, data: { status } });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "STATUS_CHANGED",
      entityType: "TICKET",
      entityId: id,
      metadata: { from: ticket.status, to: status },
    },
  });

  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function approveTicket(
  ticketId: string,
  approved: boolean,
  comment?: string
): Promise<ActionResponse> {
  const user = await requireRole("MANAGER");

  await db.approval.create({
    data: {
      ticketId,
      approverId: user.id,
      status: approved ? "APPROVED" : "REJECTED",
      comment,
    },
  });

  const newStatus: TicketStatus = approved ? "APPROVED" : "REVISION_REQUESTED";
  await db.ticket.update({ where: { id: ticketId }, data: { status: newStatus } });

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function deleteTicket(id: string): Promise<ActionResponse> {
  await requireRole("MANAGER");

  await db.ticket.delete({ where: { id } });
  revalidatePath("/tickets");
  return { success: true };
}
