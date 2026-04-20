"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Workflow,
  Zap,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Activity,
  Slack,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { updateWorkflow, deleteWorkflow } from "@/actions/workflows";
import { formatRelativeTime } from "@/lib/utils";

type WorkflowItem = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  actionType: string;
  createdAt: Date;
  createdBy: { id: string; name: string; avatar: string | null };
  _count: { logs: number };
};

const TRIGGER_LABELS: Record<string, string> = {
  ticket_created: "Ticket Created",
  ticket_status_changed: "Ticket Status Changed",
  ticket_assigned: "Ticket Assigned",
  ticket_comment: "Ticket Comment",
  task_created: "Task Created",
  task_assigned: "Task Assigned",
  task_status_changed: "Task Status Changed",
};

const TRIGGER_COLORS: Record<string, string> = {
  ticket_created: "bg-blue-100 text-blue-700",
  ticket_status_changed: "bg-amber-100 text-amber-700",
  ticket_assigned: "bg-purple-100 text-purple-700",
  ticket_comment: "bg-cyan-100 text-cyan-700",
  task_created: "bg-green-100 text-green-700",
  task_assigned: "bg-indigo-100 text-indigo-700",
  task_status_changed: "bg-orange-100 text-orange-700",
};

const ACTION_ICONS: Record<string, typeof Slack> = {
  slack_message: Slack,
  in_app_notification: Bell,
};

export function WorkflowList({ workflows }: { workflows: WorkflowItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      await updateWorkflow(id, { enabled: !enabled });
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteWorkflow(id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            Workflows
          </h1>
          <p className="text-muted-foreground text-sm">
            Automate actions when events happen — like sending Slack alerts when tickets are created.
          </p>
        </div>
        <Link href="/workflows/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </Link>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No workflows yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workflow to start automating tasks.
            </p>
            <Link href="/workflows/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => {
            const ActionIcon = ACTION_ICONS[w.actionType] || Zap;
            return (
              <Card
                key={w.id}
                className={`transition-opacity ${!w.enabled ? "opacity-60" : ""}`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ActionIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{w.name}</h3>
                        {!w.enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>
                      {w.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {w.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${TRIGGER_COLORS[w.triggerType] || ""}`}
                        >
                          {TRIGGER_LABELS[w.triggerType] || w.triggerType}
                        </Badge>
                        <span className="text-muted-foreground text-[10px]">→</span>
                        <Badge variant="outline" className="text-[10px]">
                          {w.actionType === "slack_message" ? "Slack" : "Notification"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    {w._count.logs} runs
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(w.id, w.enabled)}
                      disabled={pending}
                      title={w.enabled ? "Pause workflow" : "Enable workflow"}
                    >
                      {w.enabled ? (
                        <ToggleRight className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(w.id, w.name)}
                      disabled={pending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
