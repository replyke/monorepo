import { ReplykeHttpClient } from "../../core/client";

export interface RemoveEntityReactionProps {
  entityId: string;
  userId: string;
}

export async function removeReaction(
  client: ReplykeHttpClient,
  data: RemoveEntityReactionProps
): Promise<void> {
  const { entityId, userId } = data;
  await client.projectInstance.delete(`/entities/${entityId}/reactions`, { data: { userId } });
}
