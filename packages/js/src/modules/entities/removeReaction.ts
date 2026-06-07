import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";

export interface RemoveEntityReactionProps {
  entityId: string;
}

export async function removeReaction(
  client: SublayHttpClient,
  data: RemoveEntityReactionProps
): Promise<Entity> {
  const { entityId } = data;
  const response = await client.projectInstance.delete<Entity>(
    `/entities/${entityId}/reactions`
  );
  return response.data;
}
