"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowLeft,
  Users,
  Ban,
  ListTodo,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface TeamTaskAnalytics {
  summary: {
    totalTasks: number;
    openTasks: number;
    doneTasks: number;
    overdueTasks: number;
    urgentTasks: number;
    blockedTasks: number;
    completionRate: number;
  };
  statusCounts: { status: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  teamCounts: {
    name: string;
    dept: string;
    total: number;
    open: number;
    done: number;
    overdue: number;
  }[];
  assigneeWorkload: {
    id: string;
    name: string;
    avatar: string | null;
    total: number;
    open: number;
    done: number;
    overdue: number;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "#64748b",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#8b5cf6",
  BLOCKED: "#ef4444",
  DONE: "#22c55e",
  ON_HOLD: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#6b7280",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  BLOCKED: "Blocked",
  DONE: "Done",
  ON_HOLD: "On Hold",
};

const TEAM_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export function TeamTaskDashboardContent({
  data,
}: {
  data: TeamTaskAnalytics;
}) {
  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/team-tasks">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Team Tasks Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Analytics and insights across all team tasks
              </p>
            </div>
          </div>
        </div>
        <Link href="/team-tasks">
          <Button variant="outline" size="sm">
            View All Tasks
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Tasks"
          value={summary.totalTasks}
          icon={ListTodo}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          delay={0}
        />
        <SummaryCard
          title="Open / Active"
          value={summary.openTasks}
          icon={Clock}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
          subtitle={`${summary.completionRate}% completion rate`}
          delay={0.05}
        />
        <SummaryCard
          title="Completed"
          value={summary.doneTasks}
          icon={CheckCircle2}
          color="text-green-500"
          bgColor="bg-green-500/10"
          delay={0.1}
        />
        <SummaryCard
          title="Needs Attention"
          value={summary.overdueTasks + summary.blockedTasks}
          icon={AlertTriangle}
          color="text-red-500"
          bgColor="bg-red-500/10"
          subtitle={`${summary.overdueTasks} overdue, ${summary.blockedTasks} blocked`}
          delay={0.15}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.statusCounts.map((s) => ({
                      ...s,
                      name: STATUS_LABELS[s.status] || s.status,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                  >
                    {data.statusCounts.map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px" }}
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Priority Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.priorityCounts}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    opacity={0.5}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="priority"
                    tick={{ fontSize: 11 }}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]}>
                    {data.priorityCounts.map((entry) => (
                      <Cell
                        key={entry.priority}
                        fill={PRIORITY_COLORS[entry.priority] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Team Performance */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.teamCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No team data yet
                </p>
              ) : (
                <div className="space-y-4">
                  {data.teamCounts.map((team) => {
                    const completionPct =
                      team.total > 0
                        ? Math.round((team.done / team.total) * 100)
                        : 0;

                    return (
                      <div key={team.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {team.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {team.dept}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{team.total} total</span>
                            <span className="text-green-500">
                              {team.done} done
                            </span>
                            <span>{team.open} open</span>
                            {team.overdue > 0 && (
                              <span className="text-red-500">
                                {team.overdue} overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {completionPct}% complete
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Ban className="h-4 w-4 text-muted-foreground" />
                Attention Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                label="Overdue tasks"
                value={summary.overdueTasks}
                variant={summary.overdueTasks > 0 ? "danger" : "default"}
              />
              <StatRow
                label="Blocked tasks"
                value={summary.blockedTasks}
                variant={summary.blockedTasks > 0 ? "danger" : "default"}
              />
              <StatRow
                label="Urgent tasks"
                value={summary.urgentTasks}
                variant={summary.urgentTasks > 0 ? "warning" : "default"}
              />
              <StatRow
                label="Completion rate"
                value={`${summary.completionRate}%`}
                variant={
                  summary.completionRate >= 50 ? "success" : "warning"
                }
              />
              <StatRow
                label="Total open"
                value={summary.openTasks}
                variant="default"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Member Workload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Member Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.assigneeWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No assigned tasks yet
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.assigneeWorkload.map((person) => {
                  const initials = person.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const maxOpen = Math.max(
                    ...data.assigneeWorkload.map((p) => p.open),
                    1
                  );
                  const barWidth = (person.open / maxOpen) * 100;

                  return (
                    <div key={person.id} className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">
                            {person.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                            <span>{person.open} open</span>
                            <span className="text-green-500">
                              {person.done} done
                            </span>
                            {person.overdue > 0 && (
                              <span className="text-red-500">
                                {person.overdue} overdue
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              person.overdue > 0
                                ? "bg-red-500"
                                : person.open > 5
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
  delay,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  subtitle?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-1 text-3xl font-bold">{value}</p>
              {subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            <div className={`rounded-lg p-2.5 ${bgColor}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number | string;
  variant: "default" | "warning" | "danger" | "success";
}) {
  const valueColor =
    variant === "danger"
      ? "text-red-500 font-semibold"
      : variant === "warning"
        ? "text-orange-500 font-semibold"
        : variant === "success"
          ? "text-green-500 font-semibold"
          : "font-semibold";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${valueColor}`}>{value}</span>
    </div>
  );
}
