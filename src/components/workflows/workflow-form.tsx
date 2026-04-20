"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Zap,
  Slack,
  Bell,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createWorkflow, updateWorkflow } from "@/actions/workflows";

interface WorkflowData {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
}

interface WorkflowFormProps {
  webhooks: { id: string; name: string }[];
  workflow?: WorkflowData;
}

const TRIGGERS = [
  {
    value: "ticket_created",
    label: "Creative Ticket Created",
    description: "Fires when a new creative ticket is created",
    group: "Tickets",
  },
  {
    value: "ticket_status_changed",
    label: "Ticket Status Changed",
    description: "Fires when a ticket's status changes",
    group: "Tickets",
    hasStatusFilter: true,
  },
  {
    value: "ticket_assigned",
    label: "Ticket Assigned",
    description: "Fires when a ticket is assigned to someone",
    group: "Tickets",
  },
  {
    value: "ticket_comment",
    label: "New Ticket Comment",
    description: "Fires when someone comments on a ticket",
    group: "Tickets",
  },
  {
    value: "task_created",
    label: "Task Created",
    description: "Fires when a new UGC project task is created",
    group: "Tasks",
  },
  {
    value: "task_assigned",
    label: "Task Assigned",
    description: "Fires when a task is assigned",
    group: "Tasks",
  },
  {
    value: "task_status_changed",
    label: "Task Status Changed",
    description: "Fires when a task's status changes",
    group: "Tasks",
    hasStatusFilter: true,
  },
];

const TICKET_STATUSES = [
  { value: "NEW_REQUEST", label: "New Request" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "SIZE_CHANGES", label: "Size Changes" },
  { value: "READY_FOR_APPROVAL", label: "Ready for Approval" },
  { value: "SENT_TO_CLIENT", label: "Sent to Client" },
  { value: "NEEDS_EDIT", label: "Needs Edit" },
  { value: "APPROVED", label: "Approved" },
  { value: "AWAITING_EDITS", label: "Awaiting Assets" },
  { value: "ON_HOLD", label: "On Hold" },
];

const TASK_STATUSES = [
  { value: "RESEARCH", label: "Research" },
  { value: "MOODBOARDING", label: "Moodboarding" },
  { value: "SCRIPTING", label: "Scripting" },
  { value: "PRODUCTION", label: "Production" },
  { value: "POST_PRODUCTION", label: "Post Production" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "ON_HOLD", label: "On Hold" },
];

const ACTIONS = [
  {
    value: "slack_message",
    label: "Send Slack Message",
    description: "Send a message to a Slack channel via webhook",
    icon: Slack,
  },
];

const MESSAGE_VARIABLES = [
  { var: "{{title}}", desc: "Entity title" },
  { var: "{{actor}}", desc: "Who triggered it" },
  { var: "{{status}}", desc: "Current status" },
  { var: "{{priority}}", desc: "Priority level" },
  { var: "{{assignee}}", desc: "Assigned person" },
  { var: "{{client}}", desc: "Client name" },
  { var: "{{comment}}", desc: "Comment text" },
];

export function WorkflowForm({ webhooks, workflow }: WorkflowFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEditing = !!workflow;

  const existingActionConfig = (workflow?.actionConfig || {}) as Record<string, unknown>;
  const existingTriggerConfig = (workflow?.triggerConfig || {}) as Record<string, unknown>;

  const [name, setName] = useState(workflow?.name || "");
  const [description, setDescription] = useState(workflow?.description || "");
  const [triggerType, setTriggerType] = useState(workflow?.triggerType || "");
  const [statusFilter, setStatusFilter] = useState(
    (existingTriggerConfig.status as string) || ""
  );
  const [actionType, setActionType] = useState(workflow?.actionType || "slack_message");
  const [webhookId, setWebhookId] = useState(
    (existingActionConfig.webhookId as string) || webhooks[0]?.id || ""
  );
  const [messageTemplate, setMessageTemplate] = useState(
    (existingActionConfig.messageTemplate as string) ||
    "{{triggerLabel}}: *{{title}}* by {{actor}}"
  );
  const [error, setError] = useState("");

  const selectedTrigger = TRIGGERS.find((t) => t.value === triggerType);
  const isTicketTrigger = triggerType.startsWith("ticket");
  const statusOptions = isTicketTrigger ? TICKET_STATUSES : TASK_STATUSES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required");
    if (!triggerType) return setError("Select a trigger");
    if (actionType === "slack_message" && !webhookId) {
      return setError("Select a Slack webhook. Add one in Settings → Integrations first.");
    }

    startTransition(async () => {
      const triggerConfig: Record<string, unknown> = {};
      if (statusFilter) triggerConfig.status = statusFilter;

      const actionConfig: Record<string, unknown> = {};
      if (actionType === "slack_message") {
        actionConfig.webhookId = webhookId;
        actionConfig.messageTemplate = messageTemplate;
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        triggerConfig,
        actionType,
        actionConfig,
      };

      const res = isEditing
        ? await updateWorkflow(workflow.id, payload)
        : await createWorkflow(payload);

      if (res.success) {
        router.push("/workflows");
      } else {
        setError(res.error || `Failed to ${isEditing ? "update" : "create"} workflow`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/workflows">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            {isEditing ? "Edit Workflow" : "New Workflow"}
          </h1>
          <p className="text-sm text-muted-foreground">
            When something happens → do something automatically
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                placeholder="e.g. Alert #creative when ticket is created"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Input
                id="desc"
                placeholder="What does this workflow do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* WHEN — Trigger */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <Zap className="h-4 w-4" />
              WHEN this happens…
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select value={triggerType} onValueChange={(v) => { setTriggerType(v); setStatusFilter(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger…" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Creative Tickets</div>
                  {TRIGGERS.filter((t) => t.group === "Tickets").map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">UGC Tasks</div>
                  {TRIGGERS.filter((t) => t.group === "Tasks").map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTrigger && (
                <p className="text-xs text-muted-foreground">
                  {selectedTrigger.description}
                </p>
              )}
            </div>

            {selectedTrigger?.hasStatusFilter && (
              <div className="space-y-2">
                <Label>Only when status is (optional)</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any status</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
          </div>
        </div>

        {/* THEN — Action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-600">
              <Slack className="h-4 w-4" />
              THEN do this…
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {actionType === "slack_message" && (
              <>
                <div className="space-y-2">
                  <Label>Slack Webhook</Label>
                  {webhooks.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        No Slack webhooks configured.
                      </p>
                      <Link href="/settings/integrations">
                        <Button variant="link" size="sm" className="mt-1">
                          Add a webhook in Settings → Integrations
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Select value={webhookId} onValueChange={setWebhookId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select webhook…" />
                      </SelectTrigger>
                      <SelectContent>
                        {webhooks.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    rows={3}
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="{{triggerLabel}}: *{{title}}* by {{actor}}"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {MESSAGE_VARIABLES.map((v) => (
                      <button
                        key={v.var}
                        type="button"
                        className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono hover:bg-muted/80 transition-colors"
                        onClick={() =>
                          setMessageTemplate((prev) => prev + " " + v.var)
                        }
                        title={v.desc}
                      >
                        {v.var}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Click a variable to insert it. Uses Slack mrkdwn — *bold*, _italic_.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Saving…" : "Creating…"}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isEditing ? "Save Changes" : "Create Workflow"}
              </>
            )}
          </Button>
          <Link href="/workflows">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
