import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface FetchEntityProps {
  entityId: string;
  include?: string;
}

export async function fetchEntity(
  client: SublayHttpClient,
  data: FetchEntityProps
): Promise<Entity> {
  const { entityId, ...params } = data;
  const response = await client.projectInstance.get<Entity>(
    `/entities/${entityId}`,
    { params }
  );
  return response.data;
}
