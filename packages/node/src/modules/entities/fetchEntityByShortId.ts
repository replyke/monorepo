import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface FetchEntityByShortIdProps {
  shortId: string;
}

export async function fetchEntityByShortId(
  client: SublayHttpClient,
  data: FetchEntityByShortIdProps
): Promise<Entity> {
  const path = `/entities/by-short-id`;
  const response = await client.projectInstance.get<Entity>(path, {
    params: data,
  });
  return response.data;
}
