import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface CreateGroupConversationProps {
  name?: string;
  description?: string;
  /** Member user IDs to add to the group. Defaults to []. */
  memberIds?: string[];
  metadata?: Record<string, any>;
}

export async function createGroupConversation(
  client: SublayHttpClient,
  data: CreateGroupConversationProps
): Promise<Conversation> {
  const response = await client.projectInstance.post<Conversation>(
    "/chat/conversations",
    { type: "group", ...data }
  );
  return response.data;
}
