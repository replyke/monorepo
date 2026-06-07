import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";

export interface FetchEntityReactionsProps {
  entityId: string;
  reactionType?: ReactionType;
  page?: number;
  limit?: number;
  sortDir?: "asc" | "desc";
}

export interface FetchEntityReactionsResponse {
  data: Reaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export async function fetchReactions(
  client: SublayHttpClient,
  data: FetchEntityReactionsProps
): Promise<FetchEntityReactionsResponse> {
  const { entityId, ...params } = data;
  const response =
    await client.projectInstance.get<FetchEntityReactionsResponse>(
      `/entities/${entityId}/reactions`,
      { params }
    );
  return response.data;
}
