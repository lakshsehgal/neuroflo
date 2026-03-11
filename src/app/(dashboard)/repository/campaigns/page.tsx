import { getCampaigns } from "@/actions/repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-800",
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Track campaign performance</p>
        </div>
        <Button asChild>
          <Link href="/repository/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No campaigns yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Campaign</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Platform</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Budget</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Dates</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/repository/campaigns/${c.id}`} className="text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.client.name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[c.status] || ""} variant="secondary">
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.platform || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {c.budget ? `$${c.budget.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.startDate ? formatDate(c.startDate) : "-"}
                    {c.endDate ? ` - ${formatDate(c.endDate)}` : ""}
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
