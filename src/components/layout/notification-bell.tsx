"use client";

import { useState, useEffect } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} from "@/actions/notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, Ticket, MessageSquare, ArrowRight, ClipboardList, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Poll for unread count every 15s
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUnread() {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignore errors
    }
  }

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      try {
        const data = await getNotifications(20);
        setNotifications(data.notifications as Notification[]);
        setUnreadCount(data.unreadCount);
      } catch {
        // Ignore
      }
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const typeIcons: Record<string, React.ReactNode> = {
    TICKET_ASSIGNED: <Ticket className="h-3.5 w-3.5 text-blue-500" />,
    TICKET_COMMENT: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
    TICKET_STATUS_CHANGED: <ArrowRight className="h-3.5 w-3.5 text-orange-500" />,
    TASK_ASSIGNED: <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />,
    TASK_COMMENT: <MessageSquare className="h-3.5 w-3.5 text-teal-500" />,
    PROJECT_MEMBER_ADDED: <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />,
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Loading...
            </p>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-0",
                  !n.read && "bg-primary/5"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {typeIcons[n.type] || <Bell className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        if (!n.read) handleMarkRead(n.id);
                        setOpen(false);
                      }}
                      className="block"
                    >
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                    </>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="mt-1 shrink-0 rounded-full p-1 hover:bg-muted"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2">
          <Link
            href="/settings/notifications"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            Notification preferences
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
