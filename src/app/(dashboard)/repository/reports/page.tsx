import { getReportData, getClients } from "@/actions/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  const [metrics, clients] = await Promise.all([
    getReportData(),
    getClients(),
  ]);

  // Aggregate totals by metric name
  const totals: Record<string, number> = {};
  for (const m of metrics) {
    totals[m.name] = (totals[m.name] || 0) + m.value;
  }

  // Aggregate by client
  const byClient: Record<string, { name: string; total: number; metrics: number }> = {};
  for (const m of metrics) {
    const clientName = m.campaign.client.name;
    if (!byClient[clientName]) {
      byClient[clientName] = { name: clientName, total: 0, metrics: 0 };
    }
    byClient[clientName].total += m.value;
    byClient[clientName].metrics += 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Aggregated campaign performance data</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Data Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.length}</div>
          </CardContent>
        </Card>
        {Object.entries(totals)
          .slice(0, 2)
          .map(([name, value]) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total {name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{value.toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* By client */}
      {Object.keys(byClient).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left text-sm font-medium">Client</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Data Points</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(byClient)
                    .sort((a, b) => b.total - a.total)
                    .map((c) => (
                      <tr key={c.name} className="border-b">
                        <td className="px-4 py-2 text-sm font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-right text-sm">{c.metrics}</td>
                        <td className="px-4 py-2 text-right text-sm font-medium">
                          {c.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No campaign data yet. Add campaigns and metrics to see reports.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
