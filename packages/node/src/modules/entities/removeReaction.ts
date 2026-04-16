import { ReplykeHttpClient } from "../../core/client";

export interface RemoveEntityReactionProps {
  entityId: string;
}

export async function removeReaction(
  client: ReplykeHttpClient,
  data: RemoveEntityReactionProps
): Promise<void> {
  const { entityId } = data;
  await client.projectInstance.delete(`/entities/${entityId}/reactions`);
}
