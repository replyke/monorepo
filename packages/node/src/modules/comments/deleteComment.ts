import { ReplykeHttpClient } from "../../core/client";

export interface DeleteCommentProps {
  commentId: string;
}

export async function deleteComment(
  client: ReplykeHttpClient,
  data: DeleteCommentProps
): Promise<any> {
  const path = `/comments/${data.commentId}`;
  const response = await client.instance.delete<any>(path);
  return response.data;
}
