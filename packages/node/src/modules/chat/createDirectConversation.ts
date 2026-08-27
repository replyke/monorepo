import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface CreateDirectConversationProps {
  /** The other participant (the target). */
  userId: string;
  /** The acting user initiating the DM. Service key required to name a user. */
  actingUserId: string;
}

export async function createDirectConversation(
  client: SublayHttpClient,
  data: CreateDirectConversationProps
): Promise<Conversation> {
  const response = await client.projectInstance.post<Conversation>(
    "/chat/conversations/direct",
    data
  );
  return response.data;
}
