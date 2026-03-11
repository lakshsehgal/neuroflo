"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  PageTransition,
  AnimatedTableBody,
  AnimatedRow,
} from "@/components/motion";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  REVISION_REQUESTED: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-purple-100 text-purple-800",
};

type TicketData = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  creatorName: string;
  revisionCount: number;
  assigneeName: string | null;
  assigneeInitials: string | null;
  projectName: string | null;
};

export function TicketsContent({ tickets }: { tickets: TicketData[] }) {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Creative Tickets</h1>
            <p className="text-muted-foreground">
              Manage creative requests and approvals
            </p>
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
              <p className="text-muted-foreground">
                No tickets yet. Create your first creative request.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Due
                  </th>
                </tr>
              </thead>
              <AnimatedTableBody>
                {tickets.map((ticket) => (
                  <AnimatedRow
                    key={ticket.id}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {ticket.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        by {ticket.creatorName} &middot;{" "}
                        {ticket.revisionCount} revisions
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={statusColors[ticket.status] || ""}
                        variant="secondary"
                      >
                        {ticket.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          ticket.priority === "URGENT"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assigneeName ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {ticket.assigneeInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {ticket.assigneeName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {ticket.projectName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {ticket.dueDate
                        ? formatDate(new Date(ticket.dueDate))
                        : "-"}
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
