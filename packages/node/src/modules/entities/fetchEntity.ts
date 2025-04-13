import { ReplykeHttpClient } from "../../core/client";

export interface FetchEntityProps {
  referenceId?: string;
  entityId?: string;
  shortId?: string;
  createIfNotFound?: string;
}

export async function fetchEntity(
  client: ReplykeHttpClient,
  data: FetchEntityProps
): Promise<any> {
  const path = `/entities/single`;
  const response = await client.instance.get<any>(path, { params: data });
  return response.data;
}
