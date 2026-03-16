"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import type { NotificationType } from "@prisma/client";
import { sendPushNotification } from "@/lib/send-push";

// ─── Create Notification (internal helper) ──────────────

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  metadata?: Record<string, unknown>
) {
  // Check user preferences
  const prefs = await db.notificationPreference.findUnique({
    where: { userId },
  });

  // If prefs exist, check if this type is enabled
  if (prefs) {
    const prefMap: Record<NotificationType, boolean> = {
      TICKET_ASSIGNED: prefs.ticketAssigned,
      TICKET_COMMENT: prefs.ticketComment,
      TICKET_STATUS_CHANGED: prefs.ticketStatusChanged,
      TASK_ASSIGNED: prefs.taskAssigned,
      TASK_COMMENT: prefs.taskComment,
      PROJECT_MEMBER_ADDED: prefs.projectMemberAdded,
      CHAT_MENTION: prefs.chatMention,
      CHANNEL_INVITE: prefs.channelInvite,
    };
    if (!prefMap[type]) return; // User has opted out
  }

  await db.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      link,
      metadata: metadata ? (metadata as Record<string, string>) : undefined,
    },
  });

  // Send browser push notification
  await sendPushNotification(userId, title, body, link ?? undefined, type).catch(
    () => {} // Don't fail the action if push fails
  );
}

// ─── Fetch Notifications ────────────────────────────────

export async function getNotifications(limit: number = 20) {
  const user = await requireAuth();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const unreadCount = await db.notification.count({
    where: { userId: user.id, read: false },
  });

  return { notifications, unreadCount };
}

export async function getUnreadCount() {
  const user = await requireAuth();

  return db.notification.count({
    where: { userId: user.id, read: false },
  });
}

// ─── Mark Read ──────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });

  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return { success: true };
}

// ─── Preferences ────────────────────────────────────────

export async function getNotificationPreferences() {
  const user = await requireAuth();

  let prefs = await db.notificationPreference.findUnique({
    where: { userId: user.id },
  });

  if (!prefs) {
    prefs = await db.notificationPreference.create({
      data: { userId: user.id },
    });
  }

  return prefs;
}

export async function updateNotificationPreferences(
  data: {
    ticketAssigned: boolean;
    ticketComment: boolean;
    ticketStatusChanged: boolean;
    taskAssigned: boolean;
    taskComment: boolean;
    projectMemberAdded: boolean;
    chatMention: boolean;
    channelInvite: boolean;
  }
): Promise<ActionResponse> {
  const user = await requireAuth();

  await db.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/settings/notifications");
  return { success: true };
}

// ─── Trigger helpers (called from other actions) ────────

export async function notifyTicketAssigned(
  ticketId: string,
  ticketTitle: string,
  assigneeId: string,
  assignedByName: string
) {
  await createNotification(
    assigneeId,
    "TICKET_ASSIGNED",
    "Ticket Assigned",
    `${assignedByName} assigned you to "${ticketTitle}"`,
    `/tickets/${ticketId}`
  );
}

export async function notifyTicketComment(
  ticketId: string,
  ticketTitle: string,
  commentAuthorName: string,
  recipientIds: string[],
  authorId: string
) {
  for (const userId of recipientIds) {
    if (userId === authorId) continue;
    await createNotification(
      userId,
      "TICKET_COMMENT",
      "New Comment",
      `${commentAuthorName} commented on "${ticketTitle}"`,
      `/tickets/${ticketId}`
    );
  }
}

export async function notifyTicketStatusChanged(
  ticketId: string,
  ticketTitle: string,
  newStatus: string,
  changedByName: string,
  recipientIds: string[],
  changedById: string
) {
  const statusLabel = newStatus.replace(/_/g, " ").toLowerCase();
  for (const userId of recipientIds) {
    if (userId === changedById) continue;
    await createNotification(
      userId,
      "TICKET_STATUS_CHANGED",
      "Status Updated",
      `${changedByName} changed "${ticketTitle}" to ${statusLabel}`,
      `/tickets/${ticketId}`
    );
  }
}

export async function notifyChatMention(
  channelId: string,
  channelName: string,
  mentionedUserId: string,
  mentionedByName: string
) {
  await createNotification(
    mentionedUserId,
    "CHAT_MENTION",
    "You were mentioned",
    `${mentionedByName} mentioned you in #${channelName}`,
    `/chat`
  );
}

// ─── Task Notifications ──────────────────────────────────

export async function notifyTaskAssigned(
  taskId: string,
  taskTitle: string,
  projectId: string,
  assigneeId: string,
  assignedByName: string
) {
  await createNotification(
    assigneeId,
    "TASK_ASSIGNED",
    "Task Assigned",
    `${assignedByName} assigned you to "${taskTitle}"`,
    `/projects/${projectId}`
  );
}

export async function notifyTaskComment(
  taskId: string,
  taskTitle: string,
  projectId: string,
  commentAuthorName: string,
  recipientIds: string[],
  authorId: string
) {
  for (const userId of recipientIds) {
    if (userId === authorId) continue;
    await createNotification(
      userId,
      "TASK_COMMENT",
      "New Comment",
      `${commentAuthorName} commented on "${taskTitle}"`,
      `/projects/${projectId}`
    );
  }
}

// ─── Project Notifications ───────────────────────────────

export async function notifyProjectMemberAdded(
  projectId: string,
  projectName: string,
  memberId: string,
  addedByName: string
) {
  await createNotification(
    memberId,
    "PROJECT_MEMBER_ADDED",
    "Added to Project",
    `${addedByName} added you to "${projectName}"`,
    `/projects/${projectId}`
  );
}
