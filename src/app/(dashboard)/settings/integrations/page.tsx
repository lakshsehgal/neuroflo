import { getSlackWebhooks } from "@/actions/slack-webhooks";
import { IntegrationsContent } from "@/components/settings/integrations-content";

export default async function IntegrationsPage() {
  const webhooks = await getSlackWebhooks();
  return <IntegrationsContent webhooks={webhooks} />;
}
