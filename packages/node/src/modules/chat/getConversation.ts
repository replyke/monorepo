import { ReplykeHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface GetConversationProps {
  conversationId: string;
}

export async function getConversation(
  client: ReplykeHttpClient,
  data: GetConversationProps
): Promise<Conversation> {
  const { conversationId } = data;
  const response = await client.projectInstance.get<Conversation>(
    `/chat/conversations/${conversationId}`
  );
  return response.data;
}
