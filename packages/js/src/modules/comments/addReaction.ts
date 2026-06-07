import { SublayHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";

export interface AddCommentReactionProps {
  commentId: string;
  reactionType: ReactionType;
}

export async function addReaction(
  client: SublayHttpClient,
  data: AddCommentReactionProps
): Promise<Reaction> {
  const { commentId, reactionType } = data;
  const response = await client.projectInstance.post<Reaction>(
    `/comments/${commentId}/reactions`,
    { reactionType }
  );
  return response.data;
}
