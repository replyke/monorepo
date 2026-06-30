import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";
import { PaginationMetadata } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface FetchEntityReactionsProps
  extends SpaceReputationContextParams {
  entityId: string;
  reactionType?: ReactionType;
  page?: number;
  limit?: number;
  sortDir?: "asc" | "desc";
}

export interface FetchEntityReactionsResponse {
  data: Reaction[];
  pagination: PaginationMetadata;
}

export async function fetchReactions(
  client: SublayHttpClient,
  data: FetchEntityReactionsProps
): Promise<FetchEntityReactionsResponse> {
  const {
    entityId,
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
  const response =
    await client.projectInstance.get<FetchEntityReactionsResponse>(
      `/entities/${entityId}/reactions`,
      { params }
    );
  return response.data;
}
