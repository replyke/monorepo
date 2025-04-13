import { ReplykeHttpClient } from "../../core/client";

export interface UpdateCommentProps {
  commentId: string;
  update: string;
}

export async function updateComment(
  client: ReplykeHttpClient,
  data: UpdateCommentProps
): Promise<any> {
  const { commentId, ...restOfProps } = data;
  const path = `/comments/${data.commentId}`;
  const response = await client.instance.patch<any>(path, restOfProps);
  return response.data;
}
