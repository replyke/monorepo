import { SublayHttpClient } from "../../core/client";

export interface LeaveConversationProps {
  conversationId: string;
  /** The user leaving. Service key required to name a user. */
  userId: string;
}

export async function leaveConversation(
  client: SublayHttpClient,
  data: LeaveConversationProps
): Promise<void> {
  const { conversationId, userId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/leave`,
    { params: { userId } }
  );
}
