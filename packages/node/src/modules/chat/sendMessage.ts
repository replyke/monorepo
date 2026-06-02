import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";

export interface SendMessageProps {
  conversationId: string;
  content?: string;
  files?: any[];
  metadata?: Record<string, any>;
}

export async function sendMessage(
  client: SublayHttpClient,
  data: SendMessageProps
): Promise<ChatMessage> {
  const { conversationId, ...body } = data;
  const response = await client.projectInstance.post<ChatMessage>(
    `/chat/conversations/${conversationId}/messages`,
    body
  );
  return response.data;
}
