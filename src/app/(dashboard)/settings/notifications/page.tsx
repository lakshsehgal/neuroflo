import { getNotificationPreferences } from "@/actions/notifications";
import { NotificationPreferencesContent } from "@/components/settings/notification-preferences";

export default async function NotificationPreferencesPage() {
  const prefs = await getNotificationPreferences();

  return (
    <NotificationPreferencesContent
      preferences={{
        ticketAssigned: prefs.ticketAssigned,
        ticketComment: prefs.ticketComment,
        ticketStatusChanged: prefs.ticketStatusChanged,
        taskAssigned: prefs.taskAssigned,
        taskComment: prefs.taskComment,
        projectMemberAdded: prefs.projectMemberAdded,
        chatMention: prefs.chatMention,
        channelInvite: prefs.channelInvite,
      }}
    />
  );
}
