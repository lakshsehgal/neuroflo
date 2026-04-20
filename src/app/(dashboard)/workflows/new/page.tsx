import { getSlackWebhooks } from "@/actions/slack-webhooks";
import { WorkflowForm } from "@/components/workflows/workflow-form";

export default async function NewWorkflowPage() {
  const webhooks = await getSlackWebhooks();
  return (
    <WorkflowForm
      webhooks={webhooks.map((w) => ({ id: w.id, name: w.name }))}
    />
  );
}
