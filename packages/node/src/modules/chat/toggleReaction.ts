import { SublayHttpClient } from "../../core/client";

export interface ToggleReactionProps {
  conversationId: string;
  messageId: string;
  emoji: string;
  /** The reacting user (must be a member). Service key required to name a user. */
  userId: string;
}

export interface ToggleReactionResponse {
  /** Updated emoji → count map for the message. */
  reactionCounts: Record<string, number>;
  /** Emojis the acting user has reacted with after the toggle. */
  userReactions: string[];
  /** +1 if the reaction was added, -1 if it was removed. */
  delta: 1 | -1;
}

export async function toggleReaction(
  client: SublayHttpClient,
  data: ToggleReactionProps
): Promise<ToggleReactionResponse> {
  const { conversationId, messageId, emoji, userId } = data;
  const response = await client.projectInstance.post<ToggleReactionResponse>(
    `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
    { emoji, userId }
  );
  return response.data;
}
