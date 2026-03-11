import { getTickets } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  REVISION_REQUESTED: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-purple-100 text-purple-800",
};

export default async function TicketsPage() {
  const tickets = await getTickets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creative Tickets</h1>
          <p className="text-muted-foreground">Manage creative requests and approvals</p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No tickets yet. Create your first creative request.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Assignee</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Project</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${ticket.id}`} className="text-sm font-medium hover:underline">
                      {ticket.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      by {ticket.creator.name} &middot; {ticket._count.revisions} revisions
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[ticket.status] || ""} variant="secondary">
                      {ticket.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ticket.priority === "URGENT" ? "destructive" : "outline"}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {ticket.assignee.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {ticket.project?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {ticket.dueDate ? formatDate(ticket.dueDate) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
