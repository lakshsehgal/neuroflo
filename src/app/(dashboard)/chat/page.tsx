import { getChannels, ensureGeneralChannel, getAvailableUsers } from "@/actions/chat";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ChatLayout } from "@/components/chat/chat-layout";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Run all data fetches in parallel for faster loading
  const [generalChannelId, channels, users] = await Promise.all([
    ensureGeneralChannel().catch(() => null),
    getChannels(),
    getAvailableUsers(),
  ]);

  // Use general channel if available, otherwise fall back to first channel
  const activeChannelId = generalChannelId || channels[0]?.id || "";

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
      generalChannelId={activeChannelId}
      availableUsers={users}
    />
  );
}
