import { SublayHttpClient } from "../../core/client";

export interface RemoveEntityReactionProps {
  entityId: string;
  userId: string;
}

export async function removeReaction(
  client: SublayHttpClient,
  data: RemoveEntityReactionProps
): Promise<void> {
  const { entityId, userId } = data;
  await client.projectInstance.delete(`/entities/${entityId}/reactions`, { data: { userId } });
}
