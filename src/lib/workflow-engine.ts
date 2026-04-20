import { db } from "@/lib/db";
import { sendSlackMessage, buildSlackBlocks } from "@/lib/slack";

export type TriggerType =
  | "ticket_created"
  | "ticket_status_changed"
  | "ticket_assigned"
  | "ticket_comment"
  | "task_created"
  | "task_assigned"
  | "task_status_changed";

export interface TriggerPayload {
  triggerType: TriggerType;
  entityId: string;
  entityTitle: string;
  actorName: string;
  status?: string;
  previousStatus?: string;
  priority?: string;
  assigneeName?: string;
  clientName?: string;
  comment?: string;
  extra?: Record<string, string>;
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  ticket_created: "Creative Ticket Created",
  ticket_status_changed: "Ticket Status Changed",
  ticket_assigned: "Ticket Assigned",
  ticket_comment: "New Ticket Comment",
  task_created: "Task Created",
  task_assigned: "Task Assigned",
  task_status_changed: "Task Status Changed",
};

function matchesTriggerConfig(
  config: Record<string, unknown>,
  payload: TriggerPayload
): boolean {
  if (config.status && payload.status !== config.status) return false;
  if (config.previousStatus && payload.previousStatus !== config.previousStatus) return false;
  if (config.priority && payload.priority !== config.priority) return false;
  return true;
}

function resolveTemplate(template: string, payload: TriggerPayload): string {
  return template
    .replace(/\{\{title\}\}/g, payload.entityTitle)
    .replace(/\{\{actor\}\}/g, payload.actorName)
    .replace(/\{\{status\}\}/g, payload.status || "")
    .replace(/\{\{previousStatus\}\}/g, payload.previousStatus || "")
    .replace(/\{\{priority\}\}/g, payload.priority || "")
    .replace(/\{\{assignee\}\}/g, payload.assigneeName || "")
    .replace(/\{\{client\}\}/g, payload.clientName || "")
    .replace(/\{\{comment\}\}/g, payload.comment || "")
    .replace(/\{\{triggerLabel\}\}/g, TRIGGER_LABELS[payload.triggerType] || payload.triggerType);
}

async function executeSlackAction(
  actionConfig: Record<string, unknown>,
  payload: TriggerPayload
): Promise<{ success: boolean; error?: string }> {
  const webhookId = actionConfig.webhookId as string | undefined;
  if (!webhookId) return { success: false, error: "No webhook configured" };

  const webhook = await db.slackWebhook.findUnique({ where: { id: webhookId } });
  if (!webhook) return { success: false, error: "Webhook not found" };

  const messageTemplate =
    (actionConfig.messageTemplate as string) ||
    "{{triggerLabel}}: *{{title}}* by {{actor}}";
  const text = resolveTemplate(messageTemplate, payload);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const entityPath = payload.triggerType.startsWith("ticket")
    ? `/tickets/${payload.entityId}`
    : `/team-tasks`;

  const context: { label: string; value: string }[] = [];
  if (payload.status) context.push({ label: "Status", value: payload.status.replace(/_/g, " ") });
  if (payload.priority) context.push({ label: "Priority", value: payload.priority });
  if (payload.assigneeName) context.push({ label: "Assignee", value: payload.assigneeName });
  if (payload.clientName) context.push({ label: "Client", value: payload.clientName });

  const blocks = buildSlackBlocks(
    resolveTemplate("{{triggerLabel}}", payload),
    text,
    context,
    { text: "View in Neuroid OS", url: `${appUrl}${entityPath}` }
  );

  return sendSlackMessage(webhook.webhookUrl, { text, blocks });
}

export async function fireWorkflowTrigger(payload: TriggerPayload): Promise<void> {
  try {
    const workflows = await db.workflow.findMany({
      where: { triggerType: payload.triggerType, enabled: true },
    });

    for (const workflow of workflows) {
      const config = (workflow.triggerConfig as Record<string, unknown>) || {};
      if (!matchesTriggerConfig(config, payload)) continue;

      let result: { success: boolean; error?: string };

      if (workflow.actionType === "slack_message") {
        const actionCfg = (workflow.actionConfig as Record<string, unknown>) || {};
        result = await executeSlackAction(actionCfg, payload);
      } else {
        result = { success: false, error: `Unknown action type: ${workflow.actionType}` };
      }

      await db.workflowLog.create({
        data: {
          workflowId: workflow.id,
          status: result.success ? "success" : "failed",
          message: result.success ? "Executed successfully" : result.error,
          metadata: {
            triggerType: payload.triggerType,
            entityId: payload.entityId,
            entityTitle: payload.entityTitle,
          },
        },
      });
    }
  } catch (err) {
    console.error("[workflow-engine] Error firing triggers:", err);
  }
}
