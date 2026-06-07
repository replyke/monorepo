import { SublayHttpClient } from "../../core/client";

export interface MarkAsReadProps {
  conversationId: string;
  /** The message up to which the conversation is marked read. */
  messageId: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
}

export async function markAsRead(
  client: SublayHttpClient,
  data: MarkAsReadProps
): Promise<void> {
  const { conversationId, messageId, userId } = data;
  await client.projectInstance.post(
    `/chat/conversations/${conversationId}/read`,
    { messageId, userId }
  );
}
