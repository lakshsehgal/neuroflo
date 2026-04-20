"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/types";
import { sendSlackMessage } from "@/lib/slack";

const webhookSchema = z.object({
  name: z.string().min(1),
  webhookUrl: z.string().url().startsWith("https://hooks.slack.com/"),
});

export async function getSlackWebhooks() {
  await requireRole("MANAGER");
  return db.slackWebhook.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSlackWebhook(
  input: z.infer<typeof webhookSchema>
): Promise<ActionResponse<{ id: string }>> {
  const user = await requireRole("MANAGER");

  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid webhook URL. Must be a Slack incoming webhook URL." };

  const webhook = await db.slackWebhook.create({
    data: {
      name: parsed.data.name,
      webhookUrl: parsed.data.webhookUrl,
      createdById: user.id,
    },
  });

  revalidatePath("/settings/integrations");
  revalidatePath("/workflows");
  return { success: true, data: { id: webhook.id } };
}

export async function deleteSlackWebhook(id: string): Promise<ActionResponse> {
  await requireRole("MANAGER");
  await db.slackWebhook.delete({ where: { id } });
  revalidatePath("/settings/integrations");
  revalidatePath("/workflows");
  return { success: true };
}

export async function testSlackWebhook(id: string): Promise<ActionResponse> {
  await requireRole("MANAGER");

  const webhook = await db.slackWebhook.findUnique({ where: { id } });
  if (!webhook) return { success: false, error: "Webhook not found" };

  const result = await sendSlackMessage(webhook.webhookUrl, {
    text: "Test message from Neuroid OS Workflows",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Neuroid OS — Test Message", emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "This is a test notification from your Neuroid OS workflow integration. If you see this, the webhook is working correctly.",
        },
      },
    ],
  });

  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}
