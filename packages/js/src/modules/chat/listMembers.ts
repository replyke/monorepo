import { SublayHttpClient } from "../../core/client";
import { ConversationMember } from "../../interfaces/ConversationMember";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface ListMembersProps extends SpaceReputationContextParams {
  conversationId: string;
  page?: number;
  limit?: number;
  role?: "admin" | "member";
}

export async function listMembers(
  client: SublayHttpClient,
  data: ListMembersProps
): Promise<PaginatedResponse<ConversationMember>> {
  const {
    conversationId,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const params = {
    ...rest,
    ...buildSpaceReputationParams({
      spaceReputation,
      spaceReputationId,
      spaceReputationDescendants,
    }),
  };
  const response = await client.projectInstance.get<
    PaginatedResponse<ConversationMember>
  >(`/chat/conversations/${conversationId}/members`, { params });
  return response.data;
}
