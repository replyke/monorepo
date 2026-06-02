import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";

export interface EditMessageProps {
  conversationId: string;
  messageId: string;
  content: string;
}

export async function editMessage(
  client: SublayHttpClient,
  data: EditMessageProps
): Promise<ChatMessage> {
  const { conversationId, messageId, content } = data;
  const response = await client.projectInstance.patch<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    { content }
  );
  return response.data;
}
