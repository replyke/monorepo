import { ReplykeHttpClient } from "../../core/client";

export interface FetchCommentByReferenceIdProps {
  referenceId?: string;
}

export async function fetchCommentByReferenceId(
  client: ReplykeHttpClient,
  data: FetchCommentByReferenceIdProps
): Promise<any> {
  const path = `/comments/by-reference-id`;
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
