import { ReplykeHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";

export interface AddEntityReactionProps {
  entityId: string;
  reactionType: ReactionType;
  userId: string;
}

export async function addReaction(
  client: ReplykeHttpClient,
  data: AddEntityReactionProps
): Promise<Reaction> {
  const { entityId, reactionType, userId } = data;
  const response = await client.projectInstance.post<Reaction>(
    `/entities/${entityId}/reactions`,
    { reactionType, userId }
  );
  return response.data;
}
