import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";
import { PaginationMetadata } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchCommentReactionsProps
  extends SpaceReputationContextParams {
  commentId: string;
  reactionType?: ReactionType;
  page?: number;
  limit?: number;
  sortDir?: "asc" | "desc";
}

export interface FetchCommentReactionsResponse {
  data: Reaction[];
  pagination: PaginationMetadata;
}

export async function fetchReactions(
  client: SublayHttpClient,
  data: FetchCommentReactionsProps
): Promise<FetchCommentReactionsResponse> {
  const { commentId, ...params } = data;
  const response =
    await client.projectInstance.get<FetchCommentReactionsResponse>(
      `/comments/${commentId}/reactions`,
      { params }
    );
  return response.data;
}
