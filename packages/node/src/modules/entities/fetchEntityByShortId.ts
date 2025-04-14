import { ReplykeHttpClient } from "../../core/client";

export interface FetchEntityByShortIdProps {
  shortId: string;
}

export async function fetchEntityByShortId(
  client: ReplykeHttpClient,
  data: FetchEntityByShortIdProps
): Promise<any> {
  const path = `/entities/by-short-id`;
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
