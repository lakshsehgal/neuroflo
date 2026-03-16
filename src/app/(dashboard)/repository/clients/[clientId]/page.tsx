import { getClient } from "@/actions/repository";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Props {
  params: Promise<{ clientId: string }>;
}

const campaignStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-blue-100 text-blue-800",
};

export default async function ClientDetailPage({ params }: Props) {
  const { clientId } = await params;
  const client = await getClient(clientId);

  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        {client.industry && <p className="text-muted-foreground">{client.industry}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client.contactName && <p><span className="text-muted-foreground">Name:</span> {client.contactName}</p>}
            {client.contactEmail && <p><span className="text-muted-foreground">Email:</span> {client.contactEmail}</p>}
            {client.contactPhone && <p><span className="text-muted-foreground">Phone:</span> {client.contactPhone}</p>}
            {client.website && <p><span className="text-muted-foreground">Website:</span> {client.website}</p>}
            {client.notes && (
              <div className="mt-3">
                <p className="text-muted-foreground">Notes:</p>
                <p className="mt-1 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Campaigns ({client.campaigns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {client.campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns yet.</p>
            ) : (
              <div className="space-y-3">
                {client.campaigns.map((c) => (
                  <Link key={c.id} href={`/repository/campaigns/${c.id}`} className="block">
                    <div className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.platform || "No platform"} &middot; {c._count.metrics} metrics
                        </p>
                      </div>
                      <Badge className={campaignStatusColors[c.status] || ""} variant="secondary">
                        {c.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked projects */}
      {client.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Linked Projects ({client.projects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {client.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block">
                  <div className="flex items-center rounded-md border p-3 hover:bg-accent transition-colors">
                    <p className="text-sm font-medium">{p.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
