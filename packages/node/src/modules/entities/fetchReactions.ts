import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchEntityReactionsProps extends SpaceReputationContextParams {
  entityId: string;
  reactionType?: ReactionType;
  page?: number;
  limit?: number;
  sortDir?: "asc" | "desc";
}

export async function fetchReactions(
  client: SublayHttpClient,
  data: FetchEntityReactionsProps
): Promise<PaginatedResponse<Reaction>> {
  const { entityId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<Reaction>>(
    `/entities/${entityId}/reactions`,
    { params }
  );
  return response.data;
}
