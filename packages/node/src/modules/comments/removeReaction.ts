import { ReplykeHttpClient } from "../../core/client";

export interface RemoveCommentReactionProps {
  commentId: string;
  userId: string;
}

export async function removeReaction(
  client: ReplykeHttpClient,
  data: RemoveCommentReactionProps
): Promise<void> {
  const { commentId, userId } = data;
  await client.projectInstance.delete(`/comments/${commentId}/reactions`, { data: { userId } });
}
