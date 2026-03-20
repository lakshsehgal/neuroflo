import { getClientsForProject } from "@/actions/projects";
import { NewUGCProjectForm } from "@/components/projects/new-ugc-project-form";

export default async function NewProjectPage() {
  const clients = await getClientsForProject();

  return <NewUGCProjectForm clients={clients} />;
}
