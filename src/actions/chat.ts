"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import { notifyChatMention } from "@/actions/notifications";

// ─── Schemas ────────────────────────────────────────────

const createChannelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(250).optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]),
  memberIds: z.array(z.string()).optional(),
});

const sendMessageSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().max(4000),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
});

// ─── Channels ───────────────────────────────────────────

export async function getChannels() {
  const user = await requireAuth();

  const channels = await db.channel.findMany({
    where: {
      OR: [
        { type: "PUBLIC" },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: [{ isGeneral: "desc" }, { name: "asc" }],
  });

  return channels;
}

export async function getChannel(channelId: string) {
  const user = await requireAuth();

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true, email: true } } },
      },
    },
  });

  if (!channel) return null;

  if (channel.type === "PRIVATE") {
    const isMember = channel.members.some((m) => m.userId === user.id);
    if (!isMember) return null;
  }

  return channel;
}

export async function createChannel(
  input: z.infer<typeof createChannelSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireAuth();

  const parsed = createChannelSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const { name, description, type, memberIds } = parsed.data;

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) return { success: false, error: "Invalid channel name" };

  const existing = await db.channel.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return { success: false, error: "A channel with this name already exists" };

  const channel = await db.channel.create({
    data: {
      name,
      description,
      type,
      createdById: user.id,
      members: {
        create: [
          { userId: user.id, role: "OWNER" },
          ...(memberIds || [])
            .filter((id) => id !== user.id)
            .map((id) => ({ userId: id, role: "MEMBER" as string })),
        ],
      },
    },
  });

  revalidatePath("/chat");
  return { success: true, data: { id: channel.id } };
}

export async function ensureGeneralChannel(): Promise<string> {
  const user = await requireAuth();

  let general = await db.channel.findFirst({ where: { isGeneral: true } });

  if (!general) {
    const allUsers = await db.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    general = await db.channel.create({
      data: {
        name: "general",
        description: "Company-wide announcements and discussions",
        type: "PUBLIC",
        isGeneral: true,
        createdById: user.id,
        members: {
          create: allUsers.map((u) => ({
            userId: u.id,
            role: u.id === user.id ? "OWNER" : ("MEMBER" as string),
          })),
        },
      },
    });
  } else {
    const membership = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId: general.id, userId: user.id } },
    });
    if (!membership) {
      await db.channelMember.create({
        data: { channelId: general.id, userId: user.id },
      });
    }
  }

  return general.id;
}

export async function deleteChannel(channelId: string): Promise<ActionResponse> {
  const user = await requireAuth();

  if (user.role !== "ADMIN") {
    return { success: false, error: "Only admins can delete channels" };
  }

  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { success: false, error: "Channel not found" };
  if (channel.isGeneral) return { success: false, error: "Cannot delete the general channel" };

  // Delete all related data then the channel
  const messages = await db.message.findMany({
    where: { channelId },
    select: { pollId: true },
  });
  const pollIds = messages.map((m) => m.pollId).filter(Boolean) as string[];

  await db.pollVote.deleteMany({ where: { option: { pollId: { in: pollIds } } } });
  await db.pollOption.deleteMany({ where: { pollId: { in: pollIds } } });
  await db.poll.deleteMany({ where: { id: { in: pollIds } } });
  await db.message.deleteMany({ where: { channelId } });
  await db.channelMember.deleteMany({ where: { channelId } });
  await db.channel.delete({ where: { id: channelId } });

  revalidatePath("/chat");
  return { success: true };
}

// ─── Messages ───────────────────────────────────────────

export async function getMessages(channelId: string, cursor?: string) {
  const user = await requireAuth();

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { type: true, members: { where: { userId: user.id } } },
  });
  if (!channel) return { messages: [], hasMore: false };
  if (channel.type === "PRIVATE" && channel.members.length === 0) {
    return { messages: [], hasMore: false };
  }

  const take = 50;
  const messageInclude = {
    author: { select: { id: true, name: true, avatar: true } },
    poll: {
      include: {
        options: {
          include: { votes: { select: { userId: true } } },
          orderBy: { id: "asc" as const },
        },
      },
    },
  };

  const messages = await db.message.findMany({
    where: { channelId },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();

  return { messages: messages.reverse(), hasMore };
}

export async function sendMessage(
  input: z.infer<typeof sendMessageSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireAuth();

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const { channelId, content, fileName, fileUrl, fileType, fileSize } = parsed.data;

  if (!content && !fileUrl) return { success: false, error: "Message cannot be empty" };

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { type: true, members: { where: { userId: user.id } } },
  });
  if (!channel) return { success: false, error: "Channel not found" };
  if (channel.type === "PRIVATE" && channel.members.length === 0) {
    return { success: false, error: "Not a member of this channel" };
  }

  if (channel.type === "PUBLIC" && channel.members.length === 0) {
    await db.channelMember.create({
      data: { channelId, userId: user.id },
    });
  }

  const message = await db.message.create({
    data: {
      content: content || "",
      channelId,
      authorId: user.id,
      fileName,
      fileUrl,
      fileType,
      fileSize,
    },
  });

  // Detect @mentions and send notifications
  if (content) {
    const mentionRegex = /@([\w\s]+?)(?=\s@|\s[^@]|$)/g;
    let match;
    const mentionedNames: string[] = [];
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedNames.push(match[1].trim());
    }

    if (mentionedNames.length > 0) {
      const channel = await db.channel.findUnique({
        where: { id: channelId },
        select: { name: true },
      });
      const mentionedUsers = await db.user.findMany({
        where: {
          name: { in: mentionedNames, mode: "insensitive" },
          isActive: true,
        },
        select: { id: true },
      });

      for (const u of mentionedUsers) {
        if (u.id !== user.id) {
          notifyChatMention(channelId, channel?.name || "chat", u.id, user.name).catch(() => {});
        }
      }
    }
  }

  return { success: true, data: { id: message.id } };
}

export async function getNewMessages(channelId: string, afterId: string) {
  const user = await requireAuth();

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { type: true, members: { where: { userId: user.id } } },
  });
  if (!channel) return [];
  if (channel.type === "PRIVATE" && channel.members.length === 0) return [];

  const refMessage = await db.message.findUnique({
    where: { id: afterId },
    select: { createdAt: true },
  });
  if (!refMessage) return [];

  const messages = await db.message.findMany({
    where: {
      channelId,
      createdAt: { gt: refMessage.createdAt },
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      poll: {
        include: {
          options: {
            include: { votes: { select: { userId: true } } },
            orderBy: { id: "asc" as const },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return messages;
}

// ─── Members ────────────────────────────────────────────

export async function joinChannel(channelId: string): Promise<ActionResponse> {
  const user = await requireAuth();

  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { success: false, error: "Channel not found" };
  if (channel.type === "PRIVATE") return { success: false, error: "Cannot join private channels" };

  await db.channelMember.upsert({
    where: { channelId_userId: { channelId, userId: user.id } },
    create: { channelId, userId: user.id },
    update: {},
  });

  revalidatePath("/chat");
  return { success: true };
}

export async function leaveChannel(channelId: string): Promise<ActionResponse> {
  const user = await requireAuth();

  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { success: false, error: "Channel not found" };
  if (channel.isGeneral) return { success: false, error: "Cannot leave the general channel" };

  await db.channelMember.deleteMany({
    where: { channelId, userId: user.id },
  });

  revalidatePath("/chat");
  return { success: true };
}

export async function addMembersToChannel(
  channelId: string,
  userIds: string[]
): Promise<ActionResponse> {
  const user = await requireAuth();

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    include: { members: { where: { userId: user.id } } },
  });
  if (!channel) return { success: false, error: "Channel not found" };

  if (channel.type === "PRIVATE" && channel.members.length === 0) {
    return { success: false, error: "Not a member of this channel" };
  }

  for (const uid of userIds) {
    await db.channelMember.upsert({
      where: { channelId_userId: { channelId, userId: uid } },
      create: { channelId, userId: uid },
      update: {},
    });
  }

  revalidatePath("/chat");
  return { success: true };
}

export async function getAvailableUsers() {
  await requireAuth();

  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: "asc" },
  });
}

// ─── Polls ──────────────────────────────────────────────

export async function createPoll(
  channelId: string,
  question: string,
  options: string[]
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireAuth();

  if (!question.trim() || options.length < 2) {
    return { success: false, error: "Poll needs a question and at least 2 options" };
  }

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { type: true, members: { where: { userId: user.id } } },
  });
  if (!channel) return { success: false, error: "Channel not found" };

  // Create poll, then message linked to it
  const poll = await db.poll.create({
    data: {
      question: question.trim(),
      options: {
        create: options.filter((o) => o.trim()).map((o) => ({ text: o.trim() })),
      },
    },
  });

  const message = await db.message.create({
    data: {
      content: `📊 Poll: ${question.trim()}`,
      channelId,
      authorId: user.id,
      pollId: poll.id,
    },
  });

  return { success: true, data: { id: message.id } };
}

export async function votePoll(
  optionId: string
): Promise<ActionResponse> {
  const user = await requireAuth();

  // Check option exists
  const option = await db.pollOption.findUnique({
    where: { id: optionId },
    include: { poll: { include: { message: { select: { channelId: true } } } } },
  });
  if (!option) return { success: false, error: "Poll option not found" };

  // Remove any existing vote on this poll by this user
  const existingVotes = await db.pollVote.findMany({
    where: {
      userId: user.id,
      option: { pollId: option.pollId },
    },
  });

  if (existingVotes.length > 0) {
    await db.pollVote.deleteMany({
      where: { id: { in: existingVotes.map((v) => v.id) } },
    });
  }

  // Cast new vote (unless they clicked the same option to unvote)
  const wasVotedBefore = existingVotes.some((v) => v.optionId === optionId);
  if (!wasVotedBefore) {
    await db.pollVote.create({
      data: { optionId, userId: user.id },
    });
  }

  return { success: true };
}
