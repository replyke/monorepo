import { SublayHttpClient } from "../../core/client";

export interface DeleteConversationProps {
  conversationId: string;
  /** The acting user (must be a group admin). Service key required to name a user. */
  userId: string;
}

export async function deleteConversation(
  client: SublayHttpClient,
  data: DeleteConversationProps
): Promise<void> {
  const { conversationId, userId } = data;
  await client.projectInstance.delete(`/chat/conversations/${conversationId}`, {
    params: { userId },
  });
}
