"use client";

import { useState } from "react";
import { approveTicket, updateTicketStatus } from "@/actions/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/utils";
import { Check, X, ArrowRight } from "lucide-react";

interface Approval {
  id: string;
  status: string;
  comment: string | null;
  createdAt: Date;
  approver: { name: string };
}

interface Props {
  ticketId: string;
  status: string;
  approvals: Approval[];
}

const statusTransitions: Record<string, { label: string; next: string }[]> = {
  SUBMITTED: [{ label: "Start Work", next: "IN_PROGRESS" }],
  IN_PROGRESS: [{ label: "Submit for Review", next: "IN_REVIEW" }],
  REVISION_REQUESTED: [{ label: "Resubmit", next: "IN_PROGRESS" }],
  APPROVED: [{ label: "Mark Complete", next: "COMPLETED" }],
};

export function ApprovalWorkflow({ ticketId, status, approvals }: Props) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const transitions = statusTransitions[status] || [];
  const canApprove = status === "IN_REVIEW";

  async function handleTransition(nextStatus: string) {
    setLoading(true);
    await updateTicketStatus(ticketId, nextStatus as Parameters<typeof updateTicketStatus>[1]);
    setLoading(false);
  }

  async function handleApproval(approved: boolean) {
    setLoading(true);
    await approveTicket(ticketId, approved, comment || undefined);
    setComment("");
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status transitions */}
        {transitions.map((t) => (
          <Button
            key={t.next}
            onClick={() => handleTransition(t.next)}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {t.label}
          </Button>
        ))}

        {/* Approve/Reject (for managers) */}
        {canApprove && (
          <div className="space-y-3">
            <Textarea
              placeholder="Add a comment (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleApproval(true)}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => handleApproval(false)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Request Revision
              </Button>
            </div>
          </div>
        )}

        {/* Approval history */}
        {approvals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">History</p>
            {approvals.map((a) => (
              <div key={a.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{a.approver.name}</span>
                  <Badge variant={a.status === "APPROVED" ? "default" : "destructive"} className="text-[10px]">
                    {a.status}
                  </Badge>
                </div>
                {a.comment && <p className="mt-1 text-xs text-muted-foreground">{a.comment}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
