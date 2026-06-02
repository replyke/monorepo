import { SublayHttpClient } from "../../core/client";
import { ConversationPreview } from "../../interfaces/Conversation";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface ListConversationsProps {
  page?: number;
  limit?: number;
}

export async function listConversations(
  client: SublayHttpClient,
  data: ListConversationsProps
): Promise<PaginatedResponse<ConversationPreview>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<ConversationPreview>
  >("/chat/conversations", { params: data });
  return response.data;
}
