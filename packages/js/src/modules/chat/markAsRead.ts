import { SublayHttpClient } from "../../core/client";

export interface MarkAsReadProps {
  conversationId: string;
  /** The message up to which the conversation is marked read (uuid, required). */
  messageId: string;
}

export async function markAsRead(
  client: SublayHttpClient,
  data: MarkAsReadProps
): Promise<{ message: string }> {
  const { conversationId, messageId } = data;
  const response = await client.projectInstance.post<{ message: string }>(
    `/chat/conversations/${conversationId}/read`,
    { messageId }
  );
  return response.data;
}
