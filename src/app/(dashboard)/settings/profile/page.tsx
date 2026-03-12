import { redirect } from "next/navigation";
import { getProfile } from "@/actions/profile";
import { ProfileContent } from "@/components/settings/profile-content";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <ProfileContent
      profile={{
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        position: profile.position,
        role: profile.role,
        department: profile.department?.name || null,
        createdAt: profile.createdAt.toISOString(),
      }}
    />
  );
}
