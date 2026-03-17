"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverCard,
  FadeIn,
  AnimatedNumber,
} from "@/components/motion";
import {
  FolderKanban,
  Ticket,
  CheckSquare,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  Zap,
  CalendarDays,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { getMyCalendarEvents, disconnectCalendar, type CalendarEvent } from "@/actions/calendar";

const iconMap: Record<string, LucideIcon> = {
  FolderKanban,
  Ticket,
  CheckSquare,
  User,
};

type StatItem = {
  label: string;
  value: number;
  iconName: string;
  href: string;
  color: string;
  bgColor: string;
};

type TaskItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: string;
  dueDate: string | null;
  status: string;
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
  userAvatar: string | null;
  action: string;
  entityType: string;
  createdAt: string;
};

type DeadlineItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  priority: string;
  status: string;
};

type TeamMember = {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  role: string;
};

interface DashboardContentProps {
  userName: string;
  stats: StatItem[];
  myTasks: TaskItem[];
  myTickets: TicketItem[];
  recentActivity: ActivityItem[];
  upcomingDeadlines: DeadlineItem[];
  teamMembers: TeamMember[];
  overdueCount: number;
  unreadMessages: number;
  calendarConnected: boolean;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDaysUntil(dateStr: string) {
  const now = new Date();
  const due = new Date(dateStr);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function priorityColor(priority: string) {
  switch (priority) {
    case "URGENT": return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800";
    case "HIGH": return "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800";
    case "MEDIUM": return "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800";
    case "LOW": return "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800";
    default: return "bg-gray-500/10 text-gray-600";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "NEW_REQUEST": return "bg-blue-500/10 text-blue-600";
    case "IN_PROGRESS": case "DESIGNING": case "EDITING": return "bg-amber-500/10 text-amber-600";
    case "IN_REVIEW": case "REVIEW": return "bg-purple-500/10 text-purple-600";
    case "APPROVED": case "DELIVERED": return "bg-green-500/10 text-green-600";
    case "REVISION_NEEDED": return "bg-red-500/10 text-red-600";
    default: return "bg-gray-500/10 text-gray-600";
  }
}

function formatCalendarTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatCalendarDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function DashboardContent({
  userName,
  stats,
  myTasks,
  myTickets,
  recentActivity,
  upcomingDeadlines,
  teamMembers,
  overdueCount,
  unreadMessages,
  calendarConnected,
}: DashboardContentProps) {
  const searchParams = useSearchParams();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(calendarConnected);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Handle URL params for calendar connection feedback
  useEffect(() => {
    const error = searchParams.get("calendar_error");
    if (error === "not_configured") {
      setCalendarError("Google Calendar is not configured. Please ask your admin to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
    } else if (error === "auth_failed") {
      setCalendarError("Failed to connect Google Calendar. Please try again.");
    } else if (error === "no_code") {
      setCalendarError("Google Calendar authorization was cancelled.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (isCalendarConnected) {
      setCalendarLoading(true);
      getMyCalendarEvents().then((result) => {
        if (result.success && result.data) {
          setCalendarEvents(result.data.events);
        } else {
          setIsCalendarConnected(false);
        }
        setCalendarLoading(false);
      });
    }
  }, [isCalendarConnected]);

  async function handleDisconnectCalendar() {
    await disconnectCalendar();
    setIsCalendarConnected(false);
    setCalendarEvents([]);
  }

  // Group calendar events by date
  const eventsByDate = calendarEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const dateKey = formatCalendarDate(event.start);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero greeting */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-6">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold">{getGreeting()}, {userName}</h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening across your workspace today.
            </p>
            {/* Quick status badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {overdueCount > 0 && (
                <Link href="/projects">
                  <Badge variant="destructive" className="gap-1 cursor-pointer hover:opacity-80">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
                  </Badge>
                </Link>
              )}
              {unreadMessages > 0 && (
                <Link href="/chat">
                  <Badge variant="secondary" className="gap-1 cursor-pointer hover:opacity-80">
                    <MessageSquare className="h-3 w-3" />
                    {unreadMessages} unread {unreadMessages === 1 ? "message" : "messages"}
                  </Badge>
                </Link>
              )}
              {upcomingDeadlines.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {upcomingDeadlines.length} deadline{upcomingDeadlines.length !== 1 ? "s" : ""} this week
                </Badge>
              )}
            </div>
          </div>
          {/* Decorative gradient circles */}
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/8 blur-2xl" />
        </div>

        {/* Stats */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = iconMap[stat.iconName];
            return (
              <StaggerItem key={stat.label}>
                <Link href={stat.href}>
                  <HoverCard>
                    <Card className="transition-all hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {stat.label}
                            </p>
                            <div className="text-3xl font-bold mt-1">
                              <AnimatedNumber value={stat.value} />
                            </div>
                          </div>
                          <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                            {Icon && <Icon className={`h-6 w-6 ${stat.color}`} />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCard>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Quick Actions Row */}
        <FadeIn delay={0.15}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/projects/new">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all">
                <FolderKanban className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium">New Project</span>
              </Button>
            </Link>
            <Link href="/tickets/new">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-orange-500/5 hover:border-orange-500/30 transition-all">
                <Ticket className="h-5 w-5 text-orange-500" />
                <span className="text-xs font-medium">New Ticket</span>
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-green-500/5 hover:border-green-500/30 transition-all relative">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <span className="text-xs font-medium">Open Chat</span>
                {unreadMessages > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Button>
            </Link>
            <Link href="/tickets/dashboard">
              <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5 hover:bg-purple-500/5 hover:border-purple-500/30 transition-all">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-xs font-medium">Analytics</span>
              </Button>
            </Link>
          </div>
        </FadeIn>

        {/* Main content grid - 3 columns on large screens */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Tasks & Tickets (spans 2 on large) */}
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-6 md:grid-cols-2">
              {/* My Tasks */}
              <FadeIn delay={0.2}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        My Tasks
                      </CardTitle>
                      <Link href="/projects" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {myTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <CheckSquare className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">All caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myTasks.map((task, i) => (
                          <Link
                            key={task.id}
                            href={`/projects/${task.projectId}`}
                            className="flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-accent hover:shadow-sm active:scale-[0.99]"
                            style={{ animationDelay: `${i * 50}ms` }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{task.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground truncate">
                                  {task.projectName}
                                </p>
                                {task.dueDate && (
                                  <span className={`text-[10px] flex items-center gap-0.5 ${getDaysUntil(task.dueDate) <= 1 ? "text-red-500" : "text-muted-foreground"}`}>
                                    <Clock className="h-2.5 w-2.5" />
                                    {getDaysUntil(task.dueDate) <= 0
                                      ? "Overdue"
                                      : getDaysUntil(task.dueDate) === 1
                                      ? "Tomorrow"
                                      : `${getDaysUntil(task.dueDate)}d`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              className={`shrink-0 ml-2 text-[10px] ${priorityColor(task.priority)}`}
                              variant="outline"
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
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-orange-500" />
                        My Tickets
                      </CardTitle>
                      <Link href="/tickets" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {myTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Ticket className="h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">No active tickets</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myTickets.map((ticket) => (
                          <Link
                            key={ticket.id}
                            href={`/tickets/${ticket.id}`}
                            className="flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-accent hover:shadow-sm active:scale-[0.99]"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{ticket.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {ticket.projectName || "No project"}
                              </p>
                            </div>
                            <Badge className={`shrink-0 ml-2 text-[10px] ${statusColor(ticket.status)}`} variant="outline">
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

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <FadeIn delay={0.35}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-red-500" />
                      Upcoming Deadlines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {upcomingDeadlines.map((d) => {
                        const daysLeft = getDaysUntil(d.dueDate);
                        return (
                          <Link
                            key={d.id}
                            href={`/projects/${d.projectId}`}
                            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-all"
                          >
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              daysLeft <= 1 ? "bg-red-500/10 text-red-600" : daysLeft <= 3 ? "bg-amber-500/10 text-amber-600" : "bg-blue-500/10 text-blue-600"
                            }`}>
                              {daysLeft <= 0 ? "!" : daysLeft}
                              {daysLeft > 0 && <span className="text-[8px] ml-0.5">d</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{d.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {d.projectName} &middot; {new Date(d.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </p>
                            </div>
                            <Badge className={`text-[10px] ${priorityColor(d.priority)}`} variant="outline">{d.priority}</Badge>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Recent Activity */}
            <FadeIn delay={0.4}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No recent activity
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((log) => {
                        const initials = log.userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <div
                            key={log.id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              {log.userAvatar && <AvatarImage src={log.userAvatar} />}
                              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{log.userName}</span>{" "}
                              <span className="text-muted-foreground">
                                {log.action.toLowerCase()} a{" "}
                                {log.entityType.toLowerCase()}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(new Date(log.createdAt))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Right sidebar column */}
          <div className="space-y-6">
            {/* Google Calendar Widget */}
            <FadeIn delay={0.25}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      Calendar
                    </CardTitle>
                    {isCalendarConnected && (
                      <button
                        onClick={handleDisconnectCalendar}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!isCalendarConnected ? (
                    <div className="flex flex-col items-center py-4 text-center">
                      <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
                        <Calendar className="h-7 w-7 text-blue-500/60" />
                      </div>
                      <p className="text-sm font-medium mb-1">Connect Google Calendar</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        See your upcoming meetings right here on your dashboard.
                      </p>
                      {calendarError && (
                        <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          {calendarError}
                        </div>
                      )}
                      <a href="/api/google-calendar/connect">
                        <Button size="sm" variant="outline" className="gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Connect Google Calendar
                        </Button>
                      </a>
                    </div>
                  ) : calendarLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : calendarEvents.length === 0 ? (
                    <div className="flex flex-col items-center py-4 text-center text-muted-foreground">
                      <Calendar className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">No upcoming events this week</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(eventsByDate).map(([dateLabel, events]) => (
                        <div key={dateLabel}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{dateLabel}</p>
                          <div className="space-y-1.5">
                            {events.map((event) => (
                              <div
                                key={event.id}
                                className="flex items-start gap-2.5 rounded-md border px-2.5 py-2 hover:bg-muted/50 transition-colors group"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{event.title}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {event.allDay ? "All day" : `${formatCalendarTime(event.start)} – ${formatCalendarTime(event.end)}`}
                                    {event.location && ` · ${event.location}`}
                                  </p>
                                </div>
                                {event.htmlLink && (
                                  <a
                                    href={event.htmlLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                                  >
                                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>

            {/* Team Members */}
            <FadeIn delay={0.35}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      Team
                    </CardTitle>
                    <Link href="/settings/team" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      Manage <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {teamMembers.slice(0, 8).map((member) => {
                      const initials = member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 rounded-lg border p-2 hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            {member.avatar && <AvatarImage src={member.avatar} />}
                            <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{member.name.split(" ")[0]}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {member.position || member.role}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {teamMembers.length > 8 && (
                    <Link
                      href="/settings/team"
                      className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                    >
                      +{teamMembers.length - 8} more
                    </Link>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
