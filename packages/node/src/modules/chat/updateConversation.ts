import { ReplykeHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface UpdateConversationProps {
  conversationId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export async function updateConversation(
  client: ReplykeHttpClient,
  data: UpdateConversationProps
): Promise<Conversation> {
  const { conversationId, ...body } = data;
  const response = await client.projectInstance.patch<Conversation>(
    `/chat/conversations/${conversationId}`,
    body
  );
  return response.data;
}
