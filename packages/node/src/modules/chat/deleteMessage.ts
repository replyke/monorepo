import { SublayHttpClient } from "../../core/client";

export interface DeleteMessageProps {
  conversationId: string;
  messageId: string;
  /** The acting user (must be the author or a group admin). Service key required to name a user. */
  userId: string;
}

export async function deleteMessage(
  client: SublayHttpClient,
  data: DeleteMessageProps
): Promise<void> {
  const { conversationId, messageId, userId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    { params: { userId } }
  );
}
