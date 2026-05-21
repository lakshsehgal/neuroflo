"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Ticket, Image as ImageIcon, Megaphone, ArrowUpRight, CheckSquare, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  FolderKanban,
  Ticket,
  Image: ImageIcon,
  Megaphone,
  CheckSquare,
  User,
};

type StatItem = {
  label: string;
  value: number;
  iconName: string;
  href: string;
  color: string;
};

type TaskItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: string;
};

type TicketItem = {
  id: string;
  title: string;
  projectName: string | null;
  status: string;
};

type ActivityItem = {
  id: string;
  userName: string;
  action: string;
  entityType: string;
  createdAt: string;
};

interface DashboardContentProps {
  userName: string;
  stats: StatItem[];
  myTasks: TaskItem[];
  myTickets: TicketItem[];
  recentActivity: ActivityItem[];
}

const accentTints: Record<string, string> = {
  "text-blue-600": "bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-sky-500/20",
  "text-orange-600": "bg-amber-500/12 text-amber-600 dark:text-amber-300 ring-amber-500/20",
  "text-green-600": "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20",
  "text-purple-600": "bg-violet-500/12 text-violet-600 dark:text-violet-300 ring-violet-500/20",
};

function getTint(color: string) {
  return accentTints[color] ?? "bg-brand-muted text-brand ring-brand/20";
}

export function DashboardContent({
  userName,
  stats,
  myTasks,
  myTickets,
  recentActivity,
}: DashboardContentProps) {
  return (
    <div className="space-y-8" style={{ animation: "slide-up 0.4s var(--ease-out-expo) both" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Welcome back, <span className="text-gradient-brand">{userName}</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your agency today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = iconMap[stat.iconName];
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group block focus:outline-none"
              style={{ animation: `slide-up 0.45s var(--ease-out-expo) ${i * 60}ms both` }}
            >
              <Card className="hover-lift group-focus-visible:ring-2 group-focus-visible:ring-ring/50">
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {Icon && (
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg ring-1 ring-inset transition-transform group-hover:scale-105",
                          getTint(stat.color)
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Two-column lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          title="My Tasks"
          empty="No pending tasks"
          items={myTasks}
          render={(task) => (
            <Link
              key={task.id}
              href={`/projects/${task.projectId}`}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
              </div>
              <Badge
                variant={
                  task.priority === "URGENT"
                    ? "destructive"
                    : task.priority === "HIGH"
                      ? "warning"
                      : "secondary"
                }
              >
                {task.priority}
              </Badge>
            </Link>
          )}
        />
        <ListCard
          title="My Tickets"
          empty="No active tickets"
          items={myTickets}
          render={(ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{ticket.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ticket.projectName || "No project"}
                </p>
              </div>
              <Badge variant="outline">{ticket.status.replace(/_/g, " ")}</Badge>
            </Link>
          )}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <h3 className="text-sm font-semibold tracking-tight">Recent Activity</h3>
          <Badge variant="outline" className="font-normal">
            Live
          </Badge>
        </div>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentActivity.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 text-sm transition-colors hover:bg-accent/30"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{log.userName}</span>{" "}
                    <span className="text-muted-foreground">
                      {log.action.toLowerCase()} a {log.entityType.toLowerCase()}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatRelativeTime(new Date(log.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListCard<T>({
  title,
  empty,
  items,
  render,
}: {
  title: string;
  empty: string;
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <CardContent className="p-4">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="space-y-2">{items.map(render)}</div>
        )}
      </CardContent>
    </Card>
  );
}
