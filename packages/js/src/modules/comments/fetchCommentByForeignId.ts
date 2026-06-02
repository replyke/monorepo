import { SublayHttpClient } from "../../core/client";

export interface FetchCommentByForeignIdProps {
  foreignId: string;
}

export async function fetchCommentByForeignId(
  client: SublayHttpClient,
  data: FetchCommentByForeignIdProps
): Promise<any> {
  const path = `/comments/by-foreign-id`;
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
