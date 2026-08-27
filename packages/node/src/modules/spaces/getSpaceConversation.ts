import { SublayHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface GetSpaceConversationProps {
  spaceId: string;
  /**
   * The user to act as. Must be a (non-banned) member of the space — the call
   * fetches-or-creates the space conversation and joins this user to it.
   * Service key required to name a user.
   */
  userId: string;
}

export async function getSpaceConversation(
  client: SublayHttpClient,
  data: GetSpaceConversationProps
): Promise<Conversation> {
  const { spaceId, userId } = data;
  const response = await client.projectInstance.get<Conversation>(
    `/spaces/${spaceId}/conversation`,
    { params: { userId } }
  );
  return response.data;
}
