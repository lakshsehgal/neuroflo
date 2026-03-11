import { getCampaign } from "@/actions/repository";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);

  if (!campaign) notFound();

  // Aggregate metrics by name
  const metricSummary: Record<string, { total: number; count: number }> = {};
  for (const m of campaign.metrics) {
    if (!metricSummary[m.name]) metricSummary[m.name] = { total: 0, count: 0 };
    metricSummary[m.name].total += m.value;
    metricSummary[m.name].count += 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground">
          {campaign.client.name} &middot; {campaign.platform || "No platform"}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Badge variant="secondary">{campaign.status}</Badge>
        {campaign.budget && <span>Budget: ${campaign.budget.toLocaleString()}</span>}
        {campaign.startDate && <span>Start: {formatDate(campaign.startDate)}</span>}
        {campaign.endDate && <span>End: {formatDate(campaign.endDate)}</span>}
      </div>

      {/* Metrics summary */}
      {Object.keys(metricSummary).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metricSummary).map(([name, data]) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{data.count} data points</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Metrics table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Metrics History ({campaign.metrics.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No metrics recorded yet.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Metric</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.metrics.slice(0, 50).map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="px-4 py-2 text-sm">{formatDate(m.date)}</td>
                      <td className="px-4 py-2 text-sm">{m.name}</td>
                      <td className="px-4 py-2 text-right text-sm font-medium">{m.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
