import { SublayHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";

export interface UpdateCommentProps {
  commentId: string;
  /** New text content. Cannot be empty. Omit to leave the content untouched. */
  content?: string;
  /** Replaces the comment's metadata wholesale (not merged). */
  metadata?: Record<string, any>;
}

export async function updateComment(
  client: SublayHttpClient,
  data: UpdateCommentProps
): Promise<Comment> {
  const { commentId, ...restOfProps } = data;
  const path = `/comments/${commentId}`;
  const response = await client.projectInstance.patch<Comment>(
    path,
    restOfProps
  );
  return response.data;
}
