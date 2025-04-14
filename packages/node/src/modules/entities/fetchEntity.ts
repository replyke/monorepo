import { ReplykeHttpClient } from "../../core/client";

export interface FetchEntityProps {
  entityId: string;
}

export async function fetchEntity(
  client: ReplykeHttpClient,
  data: FetchEntityProps
): Promise<any> {
  const path = `/entities/${data.entityId}`;
  const response = await client.instance.get<any>(path);
  return response.data;
}
