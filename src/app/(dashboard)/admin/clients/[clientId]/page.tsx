import { getClient } from "@/actions/clients";
import { notFound } from "next/navigation";
import { ClientDetailContent } from "@/components/admin/client-detail-content";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();

  return <ClientDetailContent client={client} />;
}
