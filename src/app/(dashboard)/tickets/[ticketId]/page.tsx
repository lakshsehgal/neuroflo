import { getTicket } from "@/actions/tickets";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ApprovalWorkflow } from "@/components/tickets/approval-workflow";

interface Props {
  params: Promise<{ ticketId: string }>;
}

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-yellow-100 text-yellow-800",
  REVISION_REQUESTED: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  COMPLETED: "bg-purple-100 text-purple-800",
};

export default async function TicketDetailPage({ params }: Props) {
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);

  if (!ticket) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created by {ticket.creator.name} &middot; {formatRelativeTime(ticket.createdAt)}
          </p>
        </div>

        {ticket.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Revisions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revisions ({ticket.revisions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {ticket.revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revisions uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {ticket.revisions.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        v{rev.version} - {rev.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {rev.uploadedBy.name} &middot; {formatRelativeTime(rev.createdAt)}
                      </p>
                      {rev.note && <p className="mt-1 text-xs text-muted-foreground">{rev.note}</p>}
                    </div>
                    <Badge variant="outline">v{rev.version}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Comments ({ticket.comments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {ticket.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.author.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{comment.author.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <Badge className={`mt-1 ${statusColors[ticket.status] || ""}`} variant="secondary">
                {ticket.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Priority</p>
              <Badge className="mt-1" variant={ticket.priority === "URGENT" ? "destructive" : "outline"}>
                {ticket.priority}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assignee</p>
              {ticket.assignee ? (
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {ticket.assignee.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{ticket.assignee.name}</span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Unassigned</p>
              )}
            </div>
            {ticket.project && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                <p className="mt-1 text-sm">{ticket.project.name}</p>
              </div>
            )}
            {ticket.dueDate && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                <p className="mt-1 text-sm">{formatDate(ticket.dueDate)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <ApprovalWorkflow ticketId={ticket.id} status={ticket.status} approvals={ticket.approvals} />
      </div>
    </div>
  );
}
