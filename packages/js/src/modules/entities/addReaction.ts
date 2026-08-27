import { SublayHttpClient } from "../../core/client";
import { Entity } from "../../interfaces/Entity";
import { ReactionType } from "../../interfaces/Reaction";

export interface AddEntityReactionProps {
  entityId: string;
  reactionType: ReactionType;
}

export async function addReaction(
  client: SublayHttpClient,
  data: AddEntityReactionProps
): Promise<Entity> {
  const { entityId, reactionType } = data;
  const response = await client.projectInstance.post<Entity>(
    `/entities/${entityId}/reactions`,
    { reactionType }
  );
  return response.data;
}
