import { ReplykeHttpClient } from "../../core/client";

export interface FetchEntityByForeignIdProps {
  foreignId: string;
  createIfNotFound?: boolean;
}

export async function fetchEntityByForeignId(
  client: ReplykeHttpClient,
  data: FetchEntityByForeignIdProps
): Promise<any> {
  const path = `/entities/by-foreign-id`;
  const response = await client.projectInstance.get<any>(path, { params: data });
  return response.data;
}
