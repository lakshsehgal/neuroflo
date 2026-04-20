import { getWorkflows } from "@/actions/workflows";
import { WorkflowList } from "@/components/workflows/workflow-list";

export default async function WorkflowsPage() {
  const workflows = await getWorkflows();
  return <WorkflowList workflows={workflows} />;
}
