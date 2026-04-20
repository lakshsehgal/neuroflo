"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Ticket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  UserX,
  TrendingUp,
  BarChart3,
  ArrowLeft,
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
  AreaChart,
  Area,
} from "recharts";

interface TicketAnalytics {
  summary: {
    totalTickets: number;
    openTickets: number;
    approvedTickets: number;
    overdueTickets: number;
    urgentTickets: number;
    unassignedTickets: number;
    avgCompletionDays: number;
    approvalRate: number;
  };
  statusCounts: { status: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  formatCounts: { format: string; count: number }[];
  typeCounts: { type: string; count: number }[];
  assigneeWorkload: {
    id: string;
    name: string;
    avatar: string | null;
    total: number;
    open: number;
    approved: number;
    overdue: number;
  }[];
  weeklyData: { week: string; created: number; approved: number }[];
  clientCounts: { client: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  NEW_REQUEST: "#6366f1",
  IN_PROGRESS: "#3b82f6",
  SIZE_CHANGES: "#8b5cf6",
  READY_FOR_APPROVAL: "#f59e0b",
  SENT_TO_CLIENT: "#06b6d4",
  NEEDS_EDIT: "#ef4444",
  APPROVED: "#22c55e",
  AWAITING_EDITS: "#f97316",
  ON_HOLD: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#6b7280",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

const FORMAT_COLORS = ["#6366f1", "#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

const STATUS_LABELS: Record<string, string> = {
  NEW_REQUEST: "New Request",
  IN_PROGRESS: "In Progress",
  SIZE_CHANGES: "Size Changes",
  READY_FOR_APPROVAL: "Ready for Approval",
  SENT_TO_CLIENT: "Sent to Client",
  NEEDS_EDIT: "Needs Edit",
  APPROVED: "Approved",
  AWAITING_EDITS: "Awaiting Assets",
  ON_HOLD: "On Hold",
};

export function TicketDashboardContent({ data }: { data: TicketAnalytics }) {
  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/tickets">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Creative Tickets Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Analytics and insights across all creative tickets
              </p>
            </div>
          </div>
        </div>
        <Link href="/tickets">
          <Button variant="outline" size="sm">
            View All Tickets
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Tickets"
          value={summary.totalTickets}
          icon={Ticket}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          delay={0}
        />
        <SummaryCard
          title="Open / Active"
          value={summary.openTickets}
          icon={Clock}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
          subtitle={`${summary.approvalRate}% approval rate`}
          delay={0.05}
        />
        <SummaryCard
          title="Approved"
          value={summary.approvedTickets}
          icon={CheckCircle2}
          color="text-green-500"
          bgColor="bg-green-500/10"
          subtitle={`${summary.avgCompletionDays}d avg completion`}
          delay={0.1}
        />
        <SummaryCard
          title="Overdue"
          value={summary.overdueTickets}
          icon={AlertTriangle}
          color="text-red-500"
          bgColor="bg-red-500/10"
          subtitle={`${summary.urgentTickets} urgent, ${summary.unassignedTickets} unassigned`}
          delay={0.15}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ticket Velocity - Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Ticket Velocity (Last 12 Weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.weeklyData}>
                  <defs>
                    <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    stroke="#6366f1"
                    fill="url(#createdGrad)"
                    strokeWidth={2}
                    name="Created"
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    stroke="#22c55e"
                    fill="url(#approvedGrad)"
                    strokeWidth={2}
                    name="Approved"
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Distribution - Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Priority Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.priorityCounts}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
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
                  <Bar dataKey="count" name="Tickets" radius={[0, 4, 4, 0]}>
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

        {/* Format Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Format Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.formatCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="format" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                    {data.formatCounts.map((_, idx) => (
                      <Cell key={idx} fill={FORMAT_COLORS[idx % FORMAT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Team Workload & Top Clients */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Workload */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Team Workload
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.assigneeWorkload.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No assigned tickets yet
                </p>
              ) : (
                <div className="space-y-3">
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
                          {person.avatar && <AvatarImage src={person.avatar} />}
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
                                {person.approved} done
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

        {/* Top Clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Clients by Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {data.clientCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No client data yet
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.clientCounts.map((client, idx) => {
                    const maxCount = data.clientCounts[0]?.count || 1;
                    const barWidth = (client.count / maxCount) * 100;

                    return (
                      <div key={client.client}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm truncate max-w-[140px]">
                            {idx === 0 && (
                              <span className="text-yellow-500 mr-1">
                                *
                              </span>
                            )}
                            {client.client}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {client.count}
                          </Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${barWidth}%` }}
                          />
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

      {/* Creative Type & Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Creative Type Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.typeCounts.map((item) => {
                  const total = data.typeCounts.reduce((s, t) => s + t.count, 0);
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const label =
                    item.type === "NET_NEW"
                      ? "Net New"
                      : item.type === "ITERATION"
                        ? "Iteration"
                        : "Unset";

                  return (
                    <div key={item.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.type === "NET_NEW"
                              ? "bg-indigo-500"
                              : item.type === "ITERATION"
                                ? "bg-cyan-500"
                                : "bg-gray-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserX className="h-4 w-4 text-muted-foreground" />
                Attention Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                label="Unassigned tickets"
                value={summary.unassignedTickets}
                variant={summary.unassignedTickets > 0 ? "warning" : "default"}
              />
              <StatRow
                label="Overdue tickets"
                value={summary.overdueTickets}
                variant={summary.overdueTickets > 0 ? "danger" : "default"}
              />
              <StatRow
                label="Urgent tickets"
                value={summary.urgentTickets}
                variant={summary.urgentTickets > 0 ? "danger" : "default"}
              />
              <StatRow
                label="Avg. completion time"
                value={`${summary.avgCompletionDays}d`}
                variant="default"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Throughput</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatRow
                label="Total created"
                value={summary.totalTickets}
                variant="default"
              />
              <StatRow
                label="Total approved"
                value={summary.approvedTickets}
                variant="default"
              />
              <StatRow
                label="Approval rate"
                value={`${summary.approvalRate}%`}
                variant={summary.approvalRate >= 50 ? "success" : "warning"}
              />
              <StatRow
                label="Currently open"
                value={summary.openTickets}
                variant="default"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────

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
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
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
