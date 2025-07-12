import { ReplykeHttpClient } from "../../core/client";

export interface UpdateCommentProps {
  commentId: string;
  content: string;
  createdAt?: Date;
}

export async function updateComment(
  client: ReplykeHttpClient,
  data: UpdateCommentProps
): Promise<Comment> {
  const { commentId, ...restOfProps } = data;
  const path = `/comments/${data.commentId}`;
  const response = await client.projectInstance.patch<Comment>(
    path,
    restOfProps
  );
  return response.data;
}
