import { ReplykeHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface FetchEntityProps {
  entityId: string;
}

export async function fetchEntity(
  client: ReplykeHttpClient,
  data: FetchEntityProps
): Promise<Entity> {
  const path = `/entities/${data.entityId}`;
  const response = await client.projectInstance.get<any>(path);
  return response.data;
}
