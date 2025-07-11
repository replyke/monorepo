import { ReplykeHttpClient } from "../../core/client";

export interface FetchCommentProps {
  commentId: string;
}

export async function fetchComment(
  client: ReplykeHttpClient,
  data: FetchCommentProps
): Promise<Comment> {
  const path = `/comments/${data.commentId}`;
  const response = await client.projectInstance.get<any>(path);
  return response.data;
}
