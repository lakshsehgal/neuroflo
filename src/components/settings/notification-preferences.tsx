"use client";

import { useState, useEffect } from "react";
import { updateNotificationPreferences } from "@/actions/notifications";
import { unsubscribePush } from "@/actions/push-subscriptions";
import { requestPushPermission } from "@/components/layout/push-notification-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Bell,
  BellRing,
  Ticket,
  MessageSquare,
  ArrowRight,
  UserPlus,
  Loader2,
  Check,
  ClipboardList,
  FolderOpen,
} from "lucide-react";

interface PreferencesData {
  ticketAssigned: boolean;
  ticketComment: boolean;
  ticketStatusChanged: boolean;
  taskAssigned: boolean;
  taskComment: boolean;
  projectMemberAdded: boolean;
  chatMention: boolean;
  channelInvite: boolean;
}

export function NotificationPreferencesContent({
  preferences,
}: {
  preferences: PreferencesData;
}) {
  const [prefs, setPrefs] = useState(preferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pushStatus, setPushStatus] = useState<"loading" | "unsupported" | "denied" | "enabled" | "disabled">("loading");
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    checkPushStatus();
  }, []);

  async function checkPushStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setPushStatus(sub ? "enabled" : "disabled");
    } catch {
      setPushStatus("disabled");
    }
  }

  async function handleEnablePush() {
    setPushLoading(true);
    const success = await requestPushPermission();
    setPushStatus(success ? "enabled" : Notification.permission === "denied" ? "denied" : "disabled");
    setPushLoading(false);
  }

  async function handleDisablePush() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setPushStatus("disabled");
    } catch {
      // ignore
    }
    setPushLoading(false);
  }

  function toggle(key: keyof PreferencesData) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const result = await updateNotificationPreferences(prefs);
    if (result.success) {
      setMessage("Preferences saved");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }

  const hasChanges =
    prefs.ticketAssigned !== preferences.ticketAssigned ||
    prefs.ticketComment !== preferences.ticketComment ||
    prefs.ticketStatusChanged !== preferences.ticketStatusChanged ||
    prefs.taskAssigned !== preferences.taskAssigned ||
    prefs.taskComment !== preferences.taskComment ||
    prefs.projectMemberAdded !== preferences.projectMemberAdded ||
    prefs.chatMention !== preferences.chatMention ||
    prefs.channelInvite !== preferences.channelInvite;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notification Preferences
        </h1>
        <p className="text-muted-foreground">
          Choose which notifications you want to receive
        </p>
      </div>

      {/* Browser Push Notifications */}
      {pushStatus !== "loading" && pushStatus !== "unsupported" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BellRing className="h-4 w-4 text-orange-500" />
              Browser Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  {pushStatus === "denied"
                    ? "Notifications are blocked. Please enable them in your browser settings."
                    : pushStatus === "enabled"
                    ? "You will receive browser notifications even when the app is in the background."
                    : "Enable to get browser popup notifications for important updates."}
                </p>
              </div>
              {pushStatus === "denied" ? (
                <span className="text-xs text-muted-foreground">Blocked</span>
              ) : (
                <Button
                  variant={pushStatus === "enabled" ? "outline" : "default"}
                  size="sm"
                  onClick={pushStatus === "enabled" ? handleDisablePush : handleEnablePush}
                  disabled={pushLoading}
                >
                  {pushLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : pushStatus === "enabled" ? (
                    "Disable"
                  ) : (
                    "Enable"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <Check className="h-4 w-4" />
          {message}
        </div>
      )}

      {/* Ticket Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Ticket className="h-4 w-4 text-blue-500" />
            Creative Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Ticket Assigned"
            description="When a ticket is assigned to you"
            checked={prefs.ticketAssigned}
            onChange={() => toggle("ticketAssigned")}
          />
          <ToggleRow
            label="New Comment"
            description="When someone comments on a ticket you're involved in"
            checked={prefs.ticketComment}
            onChange={() => toggle("ticketComment")}
          />
          <ToggleRow
            label="Status Changed"
            description="When a ticket you created or are assigned to changes status"
            checked={prefs.ticketStatusChanged}
            onChange={() => toggle("ticketStatusChanged")}
          />
        </CardContent>
      </Card>

      {/* Tasks & Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-green-500" />
            Tasks & Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Task Assigned"
            description="When a task is assigned to you"
            checked={prefs.taskAssigned}
            onChange={() => toggle("taskAssigned")}
          />
          <ToggleRow
            label="Task Comment"
            description="When someone comments on a task you're assigned to"
            checked={prefs.taskComment}
            onChange={() => toggle("taskComment")}
          />
          <ToggleRow
            label="Added to Project"
            description="When you're added as a member to a project"
            checked={prefs.projectMemberAdded}
            onChange={() => toggle("projectMemberAdded")}
          />
        </CardContent>
      </Card>

      {/* Chat Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="@Mentions"
            description="When someone mentions you with @ in a chat channel"
            checked={prefs.chatMention}
            onChange={() => toggle("chatMention")}
          />
          <ToggleRow
            label="Channel Invites"
            description="When you're invited to a new channel"
            checked={prefs.channelInvite}
            onChange={() => toggle("channelInvite")}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !hasChanges}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Preferences"
        )}
      </Button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
