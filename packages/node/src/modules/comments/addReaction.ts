import { ReplykeHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";

export interface AddCommentReactionProps {
  commentId: string;
  reaction: ReactionType;
}

export async function addReaction(
  client: ReplykeHttpClient,
  data: AddCommentReactionProps
): Promise<Reaction> {
  const { commentId, reaction } = data;
  const response = await client.projectInstance.post<Reaction>(
    `/comments/${commentId}/reactions`,
    { reaction }
  );
  return response.data;
}
