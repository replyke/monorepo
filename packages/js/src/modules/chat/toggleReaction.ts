import { SublayHttpClient } from "../../core/client";

export interface ToggleReactionProps {
  conversationId: string;
  messageId: string;
  /** The reaction emoji (required, 1–10 chars). */
  emoji: string;
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
  const { conversationId, messageId, emoji } = data;
  const response = await client.projectInstance.post<ToggleReactionResponse>(
    `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
    { emoji }
  );
  return response.data;
}
