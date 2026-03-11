import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { FolderKanban, Ticket, Image, Megaphone } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [projectCount, ticketCount, assetCount, campaignCount, recentActivity, myTasks, myTickets] =
    await Promise.all([
      db.project.count({ where: { status: "ACTIVE" } }),
      db.ticket.count({ where: { status: { notIn: ["COMPLETED"] } } }),
      db.asset.count(),
      db.campaign.count({ where: { status: "ACTIVE" } }),
      db.activityLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.task.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" } },
        include: { project: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      db.ticket.findMany({
        where: {
          OR: [{ creatorId: user.id }, { assigneeId: user.id }],
          status: { notIn: ["COMPLETED"] },
        },
        include: { project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { label: "Active Projects", value: projectCount, icon: FolderKanban, href: "/projects", color: "text-blue-600" },
    { label: "Open Tickets", value: ticketCount, icon: Ticket, href: "/tickets", color: "text-orange-600" },
    { label: "Total Assets", value: assetCount, icon: Image, href: "/assets", color: "text-green-600" },
    { label: "Active Campaigns", value: campaignCount, icon: Megaphone, href: "/repository/campaigns", color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening across your agency.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending tasks</p>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/projects/${task.projectId}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.project.name}</p>
                    </div>
                    <Badge variant={task.priority === "URGENT" ? "destructive" : "secondary"}>
                      {task.priority}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tickets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {myTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active tickets</p>
            ) : (
              <div className="space-y-3">
                {myTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.project?.name || "No project"}</p>
                    </div>
                    <Badge variant="outline">{ticket.status.replace("_", " ")}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{log.user.name}</span>{" "}
                    <span className="text-muted-foreground">
                      {log.action.toLowerCase()} a {log.entityType.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
