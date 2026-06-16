import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface SearchContentProps extends SpaceReputationContextParams {
  query: string;
  sourceTypes?: ("entity" | "comment" | "message")[];
  spaceId?: string;
  conversationId?: string;
  limit?: number;
}

export async function searchContent(
  client: SublayHttpClient,
  data: SearchContentProps
): Promise<PaginatedResponse<Entity>> {
  const { spaceReputationId, spaceReputationDescendants, ...body } = data;
  const response = await client.projectInstance.post<PaginatedResponse<Entity>>(
    "/search/content",
    body,
    { params: { spaceReputationId, spaceReputationDescendants } }
  );
  return response.data;
}
