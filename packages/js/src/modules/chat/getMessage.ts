import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";

export interface GetMessageProps {
  conversationId: string;
  messageId: string;
}

export async function getMessage(
  client: SublayHttpClient,
  data: GetMessageProps
): Promise<ChatMessage> {
  const { conversationId, messageId } = data;
  const response = await client.projectInstance.get<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`
  );
  return response.data;
}
