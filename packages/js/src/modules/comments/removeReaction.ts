import { SublayHttpClient } from "../../core/client";

export interface RemoveCommentReactionProps {
  commentId: string;
}

export async function removeReaction(
  client: SublayHttpClient,
  data: RemoveCommentReactionProps
): Promise<void> {
  const { commentId } = data;
  await client.projectInstance.delete(`/comments/${commentId}/reactions`);
}
