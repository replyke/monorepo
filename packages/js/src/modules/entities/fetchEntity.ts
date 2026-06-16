import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface FetchEntityProps extends SpaceReputationContextParams {
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
