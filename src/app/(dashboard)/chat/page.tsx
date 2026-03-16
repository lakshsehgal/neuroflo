import { getChannels, ensureGeneralChannel, getAvailableUsers } from "@/actions/chat";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ChatLayout } from "@/components/chat/chat-layout";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let generalChannelId: string;
  try {
    generalChannelId = await ensureGeneralChannel();
  } catch {
    // If general channel creation fails, redirect to dashboard
    redirect("/dashboard");
  }

  const [channels, users] = await Promise.all([
    getChannels(),
    getAvailableUsers(),
  ]);

  return (
    <ChatLayout
      channels={channels.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        isGeneral: c.isGeneral,
        memberCount: c.members.length,
        messageCount: c._count.messages,
        isMember: c.members.some((m) => m.userId === user.id),
      }))}
      currentUserId={user.id}
      currentUserName={user.name}
      currentUserRole={user.role}
      generalChannelId={generalChannelId}
      availableUsers={users}
    />
  );
}
