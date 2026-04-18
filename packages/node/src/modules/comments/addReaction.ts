import { ReplykeHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";

export interface AddCommentReactionProps {
  commentId: string;
  reactionType: ReactionType;
  userId: string;
}

export async function addReaction(
  client: ReplykeHttpClient,
  data: AddCommentReactionProps
): Promise<Reaction> {
  const { commentId, reactionType, userId } = data;
  const response = await client.projectInstance.post<Reaction>(
    `/comments/${commentId}/reactions`,
    { reactionType, userId }
  );
  return response.data;
}
