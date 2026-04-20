"use server";

import { db } from "@/lib/db";
import { requireRole, requireAuth, isContractor } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { TicketStatus } from "@prisma/client";
import {
  notifyTicketAssigned,
  notifyTicketComment,
  notifyTicketStatusChanged,
} from "@/actions/notifications";
import { fireWorkflowTrigger } from "@/lib/workflow-engine";

/** Require MEMBER+ or CONTRACTOR role (contractors can access tickets) */
async function requireTicketAccess() {
  const user = await requireAuth();
  if (!isContractor(user.role)) {
    // For non-contractors, enforce MEMBER minimum
    await requireRole("MEMBER");
  }
  return user;
}

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
  const user = await requireTicketAccess();

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

  fireWorkflowTrigger({
    triggerType: "ticket_created",
    entityId: ticket.id,
    entityTitle: ticket.title,
    actorName: user.name,
    status: ticket.status,
    priority: ticket.priority,
    clientName: ticket.clientName || undefined,
  }).catch(console.error);

  revalidatePath("/tickets");
  return { success: true, data: { id: ticket.id } };
}

export async function updateTicket(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResponse> {
  const user = await requireTicketAccess();

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

    fireWorkflowTrigger({
      triggerType: "ticket_assigned",
      entityId: id,
      entityTitle: oldTicket?.title || "Untitled",
      actorName: user.name,
    }).catch(console.error);
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

  fireWorkflowTrigger({
    triggerType: "ticket_status_changed",
    entityId: id,
    entityTitle: ticket?.title || "Untitled",
    actorName: user.name,
    status,
  }).catch(console.error);

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

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { title: true, creatorId: true, assigneeId: true },
  });

  if (ticket) {
    // Parse @mentions from comment content
    const mentionNames = Array.from(
      content.matchAll(/@([A-Za-z]+(?:\s[A-Za-z]+)?)/g),
      (m) => m[1]
    );
    const hasChannelMention = mentionNames.some((n) => n.toLowerCase() === "channel");

    let recipientIds: string[];

    if (hasChannelMention) {
      // @channel → notify ALL active users in the organization
      const allUsers = await db.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      recipientIds = allUsers.map((u) => u.id);
    } else {
      // Start with ticket creator + assignee
      recipientIds = [ticket.creatorId, ticket.assigneeId].filter(Boolean) as string[];

      // Add individually @mentioned users by matching name
      if (mentionNames.length > 0) {
        const mentionedUsers = await db.user.findMany({
          where: {
            isActive: true,
            OR: mentionNames
              .filter((n) => n.toLowerCase() !== "channel")
              .map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
          },
          select: { id: true },
        });
        for (const mu of mentionedUsers) {
          if (!recipientIds.includes(mu.id)) {
            recipientIds.push(mu.id);
          }
        }
      }
    }

    notifyTicketComment(ticketId, ticket.title, user.name, recipientIds, user.id).catch(console.error);

    fireWorkflowTrigger({
      triggerType: "ticket_comment",
      entityId: ticketId,
      entityTitle: ticket.title,
      actorName: user.name,
      comment: content.slice(0, 200),
    }).catch(console.error);
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

export async function getCreativeDesignTeamUsers() {
  await requireAuth();
  return db.user.findMany({
    where: {
      isActive: true,
      teamMembers: {
        some: {
          team: {
            name: "Design",
            department: { name: "Creative" },
          },
        },
      },
    },
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
  const user = await requireTicketAccess();

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

// ─── Revisions ─────────────────────────────────────────

const revisionSchema = z.object({
  ticketId: z.string().min(1),
  deliveryUrl: z.string().url().optional(),
  note: z.string().optional(),
  s3Key: z.string().optional(),
  s3Url: z.string().optional(),
  fileName: z.string().optional(),
});

export async function createTicketRevision(
  input: z.infer<typeof revisionSchema>
): Promise<ActionResponse<{ id: string; version: number }>> {
  const user = await requireTicketAccess();

  const parsed = revisionSchema.safeParse(input);
  if (!parsed.success) {
    const urlError = parsed.error.issues.find((i) => i.path.includes("deliveryUrl"));
    if (urlError) return { success: false, error: "Please enter a valid URL (e.g. https://example.com)" };
    return { success: false, error: "Invalid input" };
  }

  // Must provide either a delivery URL or an S3 upload
  if (!parsed.data.deliveryUrl && !parsed.data.s3Url) {
    return { success: false, error: "Please provide a delivery link or upload a file" };
  }

  const ticket = await db.ticket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { id: true, title: true, creatorId: true, assigneeId: true },
  });
  if (!ticket) return { success: false, error: "Ticket not found" };

  // Calculate next version number
  const latestRevision = await db.revision.findFirst({
    where: { ticketId: parsed.data.ticketId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestRevision?.version ?? 0) + 1;

  const revision = await db.revision.create({
    data: {
      ticketId: parsed.data.ticketId,
      version: nextVersion,
      deliveryUrl: parsed.data.deliveryUrl || null,
      s3Key: parsed.data.s3Key || null,
      s3Url: parsed.data.s3Url || null,
      fileName: parsed.data.fileName || null,
      note: parsed.data.note || null,
      uploadedById: user.id,
    },
  });

  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "REVISION_UPLOADED",
      entityType: "TICKET",
      entityId: ticket.id,
      metadata: { version: nextVersion, title: ticket.title },
    },
  });

  // Notify ticket creator and assignee about new version
  const recipientIds = [ticket.creatorId, ticket.assigneeId].filter(
    (id): id is string => !!id && id !== user.id
  );
  if (recipientIds.length > 0) {
    notifyTicketComment(
      ticket.id,
      `Version ${nextVersion} uploaded for "${ticket.title}"`,
      user.name,
      recipientIds,
      user.id
    ).catch(console.error);
  }

  revalidatePath(`/tickets/${parsed.data.ticketId}`);
  revalidatePath("/tickets");
  return { success: true, data: { id: revision.id, version: nextVersion } };
}

export async function getTicketRevisionCount(ticketId: string): Promise<number> {
  await requireAuth();
  return db.revision.count({ where: { ticketId } });
}

export async function deleteTicket(id: string): Promise<ActionResponse> {
  await requireTicketAccess();

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

export async function bulkUpdateTickets(
  ids: string[],
  data: Record<string, unknown>
): Promise<ActionResponse> {
  await requireTicketAccess();

  const updateData: Record<string, unknown> = { ...data };
  if (updateData.dueDate && typeof updateData.dueDate === "string") {
    updateData.dueDate = new Date(updateData.dueDate as string);
  }

  await db.ticket.updateMany({
    where: { id: { in: ids } },
    data: updateData,
  });

  revalidatePath("/tickets");
  return { success: true };
}

export async function updateRevisionDeliveryUrl(
  revisionId: string,
  deliveryUrl: string
): Promise<ActionResponse> {
  await requireTicketAccess();

  const revision = await db.revision.findUnique({
    where: { id: revisionId },
    select: { ticketId: true },
  });

  if (!revision) return { success: false, error: "Revision not found" };

  await db.revision.update({
    where: { id: revisionId },
    data: { deliveryUrl: deliveryUrl || null },
  });

  revalidatePath(`/tickets/${revision.ticketId}`);
  return { success: true };
}
