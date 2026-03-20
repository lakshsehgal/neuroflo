"use client";

import { useState } from "react";
import { createGuestAccess, revokeGuestAccess } from "@/actions/guest-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Share2,
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  UserPlus,
  Globe,
  Clock,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";

type GuestAccessItem = {
  id: string;
  token: string;
  email: string | null;
  name: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

interface GuestAccessPanelProps {
  projectId: string;
  guestAccess: GuestAccessItem[];
}

export function GuestAccessPanel({
  projectId,
  guestAccess: initialAccess,
}: GuestAccessPanelProps) {
  const [access, setAccess] = useState(initialAccess);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  function getShareUrl(token: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/guest/${token}`;
    }
    return `/guest/${token}`;
  }

  async function handleCreate() {
    setCreating(true);
    const result = await createGuestAccess({
      projectId,
      email: email || undefined,
      name: name || undefined,
      expiresAt: expiresAt || undefined,
    });
    if (result.success && result.data) {
      setNewToken(result.data.token);
      setEmail("");
      setName("");
      setExpiresAt("");
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    const result = await revokeGuestAccess(id);
    if (result.success) {
      setAccess((prev) => prev.filter((a) => a.id !== id));
    }
    setRevokingId(null);
  }

  function handleCopy(token: string, id: string) {
    navigator.clipboard.writeText(getShareUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Client Access
            </CardTitle>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setNewToken(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Create Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Guest Access Link</DialogTitle>
                </DialogHeader>
                {newToken ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                        Link created successfully!
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={getShareUrl(newToken)}
                          readOnly
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(getShareUrl(newToken));
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this link with your client. They can view the
                      project status without logging in.
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setDialogOpen(false);
                        setNewToken(null);
                        window.location.reload();
                      }}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Client Name (optional)</Label>
                      <Input
                        placeholder="e.g., John from Brand X"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Email (optional)</Label>
                      <Input
                        type="email"
                        placeholder="john@brandx.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expires On (optional)</Label>
                      <Input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty for no expiration
                      </p>
                    </div>
                    <Button
                      onClick={handleCreate}
                      disabled={creating}
                      className="w-full"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Link2 className="mr-2 h-4 w-4" />
                          Generate Link
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 mb-4">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Share with clients</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a guest access link so clients can view the project
                  progress, video stages, and creator information — without
                  needing an account.
                </p>
              </div>
            </div>
          </div>

          {/* Active links */}
          {access.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No active access links. Create one to share with your client.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Active Links ({access.length})
              </p>
              {access.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium truncate">
                        {item.name || item.email || "Unnamed link"}
                      </p>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 text-[10px]"
                      >
                        Active
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Created {formatRelativeTime(item.createdAt)}
                      </span>
                      {item.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires {formatDate(item.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleCopy(item.token, item.id)}
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(item.id)}
                      disabled={revokingId === item.id}
                    >
                      {revokingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
