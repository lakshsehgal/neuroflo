import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ProfileForm user={user} />;
}
