import { SublayHttpClient } from "../../core/client";

export interface FetchCommentProps {
  commentId: string;
}

export async function fetchComment(
  client: SublayHttpClient,
  data: FetchCommentProps
): Promise<any> {
  const path = `/comments/${data.commentId}`;
  const response = await client.instance.get<any>(path);
  return response.data;
}
