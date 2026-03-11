"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverCard,
  FadeIn,
  AnimatedNumber,
} from "@/components/motion";
import { FolderKanban, Ticket, Image, Megaphone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  FolderKanban,
  Ticket,
  Image,
  Megaphone,
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

export function DashboardContent({
  userName,
  stats,
  myTasks,
  myTickets,
  recentActivity,
}: DashboardContentProps) {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening across your agency.
          </p>
        </div>

        {/* Stats */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = iconMap[stat.iconName];
            return (
              <StaggerItem key={stat.label}>
                <Link href={stat.href}>
                  <HoverCard>
                    <Card className="transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.label}
                        </CardTitle>
                        {Icon && <Icon className={`h-5 w-5 ${stat.color}`} />}
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          <AnimatedNumber value={stat.value} />
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCard>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Tasks */}
          <FadeIn delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {myTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending tasks
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myTasks.map((task, i) => (
                      <Link
                        key={task.id}
                        href={`/projects/${task.projectId}`}
                        className="flex items-center justify-between rounded-md border p-3 transition-all hover:bg-accent hover:shadow-sm active:scale-[0.99]"
                        style={{
                          animationDelay: `${i * 50}ms`,
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.projectName}
                          </p>
                        </div>
                        <Badge
                          variant={
                            task.priority === "URGENT"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* My Tickets */}
          <FadeIn delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {myTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active tickets
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/tickets/${ticket.id}`}
                        className="flex items-center justify-between rounded-md border p-3 transition-all hover:bg-accent hover:shadow-sm active:scale-[0.99]"
                      >
                        <div>
                          <p className="text-sm font-medium">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.projectName || "No project"}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {ticket.status.replace(/_/g, " ")}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* Recent Activity */}
        <FadeIn delay={0.4}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-medium">{log.userName}</span>{" "}
                        <span className="text-muted-foreground">
                          {log.action.toLowerCase()} a{" "}
                          {log.entityType.toLowerCase()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(log.createdAt))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
