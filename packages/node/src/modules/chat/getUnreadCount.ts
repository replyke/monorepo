import { SublayHttpClient } from "../../core/client";

export interface GetUnreadCountProps {
  /** The user to act as. Service key required to name a user. */
  userId: string;
}

export interface UnreadCountResponse {
  totalUnread: number;
  unreadConversationCount: number;
}

export async function getUnreadCount(
  client: SublayHttpClient,
  data: GetUnreadCountProps
): Promise<UnreadCountResponse> {
  const { userId } = data;
  const response = await client.projectInstance.get<UnreadCountResponse>(
    "/chat/conversations/unread-count",
    { params: { userId } }
  );
  return response.data;
}
