import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchCommentReactionsProps {
  commentId: string;
  reactionType?: ReactionType;
  page?: number;
  limit?: number;
  sortDir?: "asc" | "desc";
}

export async function fetchReactions(
  client: SublayHttpClient,
  data: FetchCommentReactionsProps
): Promise<PaginatedResponse<Reaction>> {
  const { commentId, ...params } = data;
  const response = await client.projectInstance.get<PaginatedResponse<Reaction>>(
    `/comments/${commentId}/reactions`,
    { params }
  );
  return response.data;
}
