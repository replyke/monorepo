import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface CreateGroupConversationProps {
  name: string;
  memberIds: string[];
  description?: string;
  metadata?: Record<string, any>;
}

export async function createGroupConversation(
  client: SublayHttpClient,
  data: CreateGroupConversationProps
): Promise<Conversation> {
  const response = await client.projectInstance.post<Conversation>(
    "/chat/conversations",
    data
  );
  return response.data;
}
