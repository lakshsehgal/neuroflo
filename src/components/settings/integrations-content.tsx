"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plug,
  Slack,
  Plus,
  Trash2,
  Loader2,
  Check,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  createSlackWebhook,
  deleteSlackWebhook,
  testSlackWebhook,
} from "@/actions/slack-webhooks";

type WebhookItem = {
  id: string;
  name: string;
  webhookUrl: string;
  createdAt: Date;
  createdBy: { name: string };
};

export function IntegrationsContent({
  webhooks: initial,
}: {
  webhooks: WebhookItem[];
}) {
  const [webhooks, setWebhooks] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const res = await createSlackWebhook({ name: name.trim(), webhookUrl: url.trim() });
      if (res.success && res.data) {
        setWebhooks((prev) => [
          {
            id: res.data!.id,
            name: name.trim(),
            webhookUrl: url.trim(),
            createdAt: new Date(),
            createdBy: { name: "You" },
          },
          ...prev,
        ]);
        setName("");
        setUrl("");
        setShowForm(false);
        setMessage({ type: "success", text: "Webhook added" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: res.error || "Failed to add webhook" });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this webhook?")) return;
    startTransition(async () => {
      await deleteSlackWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    });
  }

  function handleTest(id: string) {
    setTestingId(id);
    setMessage(null);
    startTransition(async () => {
      const res = await testSlackWebhook(id);
      setTestingId(null);
      setMessage(
        res.success
          ? { type: "success", text: "Test message sent to Slack!" }
          : { type: "error", text: res.error || "Failed to send test" }
      );
      setTimeout(() => setMessage(null), 5000);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="h-6 w-6" />
          Integrations
        </h1>
        <p className="text-muted-foreground text-sm">
          Connect external services to power your workflows.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Slack Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Slack className="h-4 w-4" />
              Slack Incoming Webhooks
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Add Slack incoming webhook URLs to send automated messages to your channels.{" "}
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              How to create a webhook
            </a>
          </p>

          {showForm && (
            <form
              onSubmit={handleAdd}
              className="space-y-3 rounded-md border p-4 bg-muted/30"
            >
              <div className="space-y-2">
                <Label htmlFor="wh-name">Label</Label>
                <Input
                  id="wh-name"
                  placeholder="e.g. #creative-alerts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-url">Webhook URL</Label>
                <Input
                  id="wh-url"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {webhooks.length === 0 && !showForm && (
            <div className="rounded-md border border-dashed p-6 text-center">
              <Slack className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No webhooks configured yet.
              </p>
            </div>
          )}

          {webhooks.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{w.name}</p>
                <p className="text-xs text-muted-foreground truncate font-mono">
                  {w.webhookUrl.slice(0, 50)}…
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTest(w.id)}
                  disabled={pending}
                >
                  {testingId === w.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-1 h-3 w-3" />
                      Test
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(w.id)}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
