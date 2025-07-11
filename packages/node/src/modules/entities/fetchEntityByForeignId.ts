import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface FetchEntityByForeignIdProps {
  foreignId: string;
  createIfNotFound?: boolean;
}

export async function fetchEntityByForeignId(
  client: ReplykeHttpClient,
  data: FetchEntityByForeignIdProps
): Promise<Entity> {
  const path = `/entities/by-foreign-id`;
  const response = await client.projectInstance.get<any>(path, {
    params: data,
  });
  return response.data;
}
