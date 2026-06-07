import { SublayHttpClient } from "../../core/client";
import { ReactionType } from "../../interfaces/Reaction";
import { Comment } from "../../interfaces/Comment";

export interface AddCommentReactionProps {
  commentId: string;
  reactionType: ReactionType;
}

export async function addReaction(
  client: SublayHttpClient,
  data: AddCommentReactionProps
): Promise<Comment> {
  const { commentId, reactionType } = data;
  // The server returns the full populated comment (mirrors entity addReaction).
  const response = await client.projectInstance.post<Comment>(
    `/comments/${commentId}/reactions`,
    { reactionType }
  );
  return response.data;
}
