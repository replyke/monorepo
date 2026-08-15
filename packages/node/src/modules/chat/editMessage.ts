import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { GifData } from "../../interfaces/Comment";
import { Mention } from "../../interfaces/Mention";

export interface EditMessageProps {
  conversationId: string;
  messageId: string;
  /** The acting user (must be the message author). Service key required to name a user. */
  userId: string;
  content?: string;
  /** A GIF attachment, or null to clear it. */
  gif?: GifData | null;
  mentions?: Mention[];
  metadata?: Record<string, any> | null;
}

export async function editMessage(
  client: SublayHttpClient,
  data: EditMessageProps
): Promise<ChatMessage> {
  const { conversationId, messageId, ...body } = data;
  const response = await client.projectInstance.patch<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    body
  );
  return response.data;
}
