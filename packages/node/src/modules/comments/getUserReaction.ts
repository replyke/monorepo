import { SublayHttpClient } from "../../core/client";
import { ReactionType } from "../../interfaces/Reaction";

export interface GetUserCommentReactionProps {
  commentId: string;
  userId: string;
}

export interface UserCommentReactionResponse {
  reactionType: ReactionType | null;
}

export async function getUserReaction(
  client: SublayHttpClient,
  data: GetUserCommentReactionProps
): Promise<UserCommentReactionResponse> {
  const { commentId, userId } = data;
  const response =
    await client.projectInstance.get<UserCommentReactionResponse>(
      `/comments/${commentId}/reactions/me`,
      { params: { userId } }
    );
  return response.data;
}
