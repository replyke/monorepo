import { ReplykeHttpClient } from "../../core/client";

export interface FetchCommentProps {
  commentId?: string;
}

export async function fetchComment(
  client: ReplykeHttpClient,
  data: FetchCommentProps
): Promise<any> {
  const path = `/comments/${data.commentId}`;
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
