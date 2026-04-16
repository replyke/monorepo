import { ReplykeHttpClient } from "../../core/client";
import { ReactionType } from "../../interfaces/Reaction";

export interface GetUserCommentReactionProps {
  commentId: string;
}

export interface UserCommentReactionResponse {
  reaction: ReactionType | null;
}

export async function getUserReaction(
  client: ReplykeHttpClient,
  data: GetUserCommentReactionProps
): Promise<UserCommentReactionResponse> {
  const { commentId } = data;
  const response =
    await client.projectInstance.get<UserCommentReactionResponse>(
      `/comments/${commentId}/reactions/me`
    );
  return response.data;
}
