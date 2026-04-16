import { ReplykeHttpClient } from "../../core/client";
import { ReactionType } from "../../interfaces/Reaction";

export interface GetUserEntityReactionProps {
  entityId: string;
}

export interface UserReactionResponse {
  reaction: ReactionType | null;
}

export async function getUserReaction(
  client: ReplykeHttpClient,
  data: GetUserEntityReactionProps
): Promise<UserReactionResponse> {
  const { entityId } = data;
  const response = await client.projectInstance.get<UserReactionResponse>(
    `/entities/${entityId}/reactions/me`
  );
  return response.data;
}
