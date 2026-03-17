import { getClient, getClientOwnerCandidates } from "@/actions/clients";
import { getClientOnboarding } from "@/actions/onboarding";
import { notFound } from "next/navigation";
import { ClientDetailContent } from "@/components/admin/client-detail-content";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { clientId } = await params;
  const [client, onboarding, ownerCandidates] = await Promise.all([
    getClient(clientId),
    getClientOnboarding(clientId),
    getClientOwnerCandidates(),
  ]);
  if (!client) notFound();

  return <ClientDetailContent client={client} onboarding={onboarding} ownerCandidates={ownerCandidates} />;
}
