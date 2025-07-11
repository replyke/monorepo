import { ReplykeHttpClient } from "../../core/client";

export interface FetchCommentByForeignIdProps {
  foreignId: string;
}

export async function fetchCommentByForeignId(
  client: ReplykeHttpClient,
  data: FetchCommentByForeignIdProps
): Promise<Comment> {
  const path = `/comments/by-foreign-id`;
  const response = await client.projectInstance.get<Comment>(path, {
    params: data,
  });
  return response.data;
}
