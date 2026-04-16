import { ReplykeHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface CreateDirectConversationProps {
  userId: string;
}

export async function createDirectConversation(
  client: ReplykeHttpClient,
  data: CreateDirectConversationProps
): Promise<Conversation> {
  const response = await client.projectInstance.post<Conversation>(
    "/chat/conversations/direct",
    data
  );
  return response.data;
}
