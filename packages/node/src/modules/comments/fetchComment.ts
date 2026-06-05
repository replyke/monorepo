import { SublayHttpClient } from "../../core/client";
import { Comment } from "../../interfaces/Comment";

export interface FetchCommentProps {
  commentId: string;
  include?: string;
}

export async function fetchComment(
  client: SublayHttpClient,
  data: FetchCommentProps
): Promise<Comment> {
  const { commentId, ...params } = data;
  const response = await client.projectInstance.get<Comment>(
    `/comments/${commentId}`,
    { params }
  );
  return response.data;
}
