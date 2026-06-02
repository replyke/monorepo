import { SublayHttpClient } from "../../core/client";

export interface ToggleReactionProps {
  conversationId: string;
  messageId: string;
  emoji: string;
}

export interface ToggleReactionResponse {
  added: boolean;
  emoji: string;
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
