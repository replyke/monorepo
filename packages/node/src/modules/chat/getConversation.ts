import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface GetConversationProps {
  conversationId: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
}

export async function getConversation(
  client: SublayHttpClient,
  data: GetConversationProps
): Promise<Conversation> {
  const { conversationId, userId } = data;
  const response = await client.projectInstance.get<Conversation>(
    `/chat/conversations/${conversationId}`,
    { params: { userId } }
  );
  return response.data;
}
