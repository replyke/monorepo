import { SublayHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";

export interface RemoveCommentReactionProps {
  commentId: string;
}

export async function removeReaction(
  client: SublayHttpClient,
  data: RemoveCommentReactionProps
): Promise<Comment> {
  const { commentId } = data;
  // The server returns the full populated comment (mirrors entity removeReaction).
  const response = await client.projectInstance.delete<Comment>(
    `/comments/${commentId}/reactions`
  );
  return response.data;
}
