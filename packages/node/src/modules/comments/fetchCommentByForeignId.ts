import { ReplykeHttpClient } from "../../core/client";

export interface FetchCommentByForeignIdProps {
  foreignId: string;
}

export async function fetchCommentByForeignId(
  client: ReplykeHttpClient,
  data: FetchCommentByForeignIdProps
): Promise<any> {
  const path = `/comments/by-foreign-id`;
  const response = await client.projectInstance.get<any>(path, { params: data });
  return response.data;
}
