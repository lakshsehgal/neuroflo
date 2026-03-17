import { getClientMandatesView } from "@/actions/clients";
import { ClientMandatesContent } from "@/components/client-mandates/client-mandates-content";

export default async function ClientMandatesPage() {
  const clients = await getClientMandatesView();

  return (
    <ClientMandatesContent
      clients={clients.map((c) => ({
        id: c.id,
        name: c.name,
        mandates: c.mandates,
        sow: c.sow,
      }))}
    />
  );
}
