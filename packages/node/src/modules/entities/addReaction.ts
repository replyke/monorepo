import { ReplykeHttpClient } from "../../core/client";
import { Reaction, ReactionType } from "../../interfaces/Reaction";

export interface AddEntityReactionProps {
  entityId: string;
  reaction: ReactionType;
}

export async function addReaction(
  client: ReplykeHttpClient,
  data: AddEntityReactionProps
): Promise<Reaction> {
  const { entityId, reaction } = data;
  const response = await client.projectInstance.post<Reaction>(
    `/entities/${entityId}/reactions`,
    { reaction }
  );
  return response.data;
}
