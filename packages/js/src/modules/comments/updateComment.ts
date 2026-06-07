import { SublayHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";

export interface UpdateCommentProps {
  commentId: string;
  content: string;
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
