import { getWorkflow } from "@/actions/workflows";
import { getSlackWebhooks } from "@/actions/slack-webhooks";
import { WorkflowForm } from "@/components/workflows/workflow-form";
import { notFound } from "next/navigation";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workflow, webhooks] = await Promise.all([
    getWorkflow(id),
    getSlackWebhooks(),
  ]);

  if (!workflow) notFound();

  return (
    <WorkflowForm
      webhooks={webhooks.map((w) => ({ id: w.id, name: w.name }))}
      workflow={{
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        triggerType: workflow.triggerType,
        triggerConfig: (workflow.triggerConfig as Record<string, unknown>) || {},
        actionType: workflow.actionType,
        actionConfig: (workflow.actionConfig as Record<string, unknown>) || {},
      }}
    />
  );
}
