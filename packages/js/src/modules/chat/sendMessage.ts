import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { GifData } from "../../interfaces/Comment";
import { Mention } from "../../interfaces/Mention";

// NOTE: multipart file attachments not yet supported — JSON body only.
export interface SendMessageProps {
  conversationId: string;
  content?: string;
  gif?: GifData | null;
  mentions?: Mention[];
  parentMessageId?: string;
  quotedMessageId?: string;
  metadata?: Record<string, any>;
  /** Client-generated id echoed back on the created message (not stored). */
  localId?: string;
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
