import { SublayHttpClient } from "../../core/client";

export interface FetchCommentProps {
  commentId: string;
}

export async function fetchComment(
  client: SublayHttpClient,
  data: FetchCommentProps
): Promise<Comment> {
  const path = `/comments/${data.commentId}`;
  const response = await client.projectInstance.get<Comment>(path);
  return response.data;
}
