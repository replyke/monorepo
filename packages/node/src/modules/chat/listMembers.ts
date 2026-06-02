import { SublayHttpClient } from "../../core/client";
import { ConversationMember } from "../../interfaces/ConversationMember";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface ListMembersProps {
  conversationId: string;
  page?: number;
  limit?: number;
}

export async function listMembers(
  client: SublayHttpClient,
  data: ListMembersProps
): Promise<PaginatedResponse<ConversationMember>> {
  const { conversationId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<ConversationMember>
  >(`/chat/conversations/${conversationId}/members`, { params });
  return response.data;
}
