import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { db } from "@/lib/db";
import { ProfileContent } from "@/components/settings/profile-content";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    include: { department: { select: { name: true } } },
  });

  if (!dbUser) redirect("/login");

  return (
    <ProfileContent
      profile={{
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatar: dbUser.avatar,
        position: dbUser.position,
        role: dbUser.role,
        department: dbUser.department?.name || null,
        createdAt: dbUser.createdAt.toISOString(),
      }}
    />
  );
}
