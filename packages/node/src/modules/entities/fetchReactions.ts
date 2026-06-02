import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchEntityReactionsProps {
  entityId: string;
  reaction?: ReactionType;
  page?: number;
  limit?: number;
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
