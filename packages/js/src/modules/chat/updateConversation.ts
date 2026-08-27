import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface UpdateConversationProps {
  conversationId: string;
  name?: string;
  description?: string;
  /** File id for the conversation avatar, or null to clear it. */
  avatarFileId?: string | null;
  /** Space conversations only: who may post. */
  postingPermission?: "members" | "admins";
}

export async function updateConversation(
  client: SublayHttpClient,
  data: UpdateConversationProps
): Promise<Conversation> {
  const { conversationId, ...body } = data;
  const response = await client.projectInstance.patch<Conversation>(
    `/chat/conversations/${conversationId}`,
    body
  );
  return response.data;
}
