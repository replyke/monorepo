import { SublayHttpClient } from "../../core/client";
import { ConversationMember } from "../../interfaces/ConversationMember";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface ListMembersProps {
  conversationId: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
  page?: number;
  limit?: number;
  role?: "admin" | "member";
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
