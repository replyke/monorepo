import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";

export interface GetMessageProps {
  conversationId: string;
  messageId: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
}

export async function getMessage(
  client: SublayHttpClient,
  data: GetMessageProps
): Promise<ChatMessage> {
  const { conversationId, messageId, userId } = data;
  const response = await client.projectInstance.get<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    { params: { userId } }
  );
  return response.data;
}
