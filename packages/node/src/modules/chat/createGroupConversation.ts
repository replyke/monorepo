import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface CreateGroupConversationProps {
  /** The acting user (becomes the group admin). Service key required to name a user. */
  userId: string;
  name?: string;
  description?: string;
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
