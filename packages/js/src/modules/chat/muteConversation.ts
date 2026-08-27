import { SublayHttpClient } from "../../core/client";
import { ConversationMember } from "../../interfaces/ConversationMember";
import { MuteDuration } from "../../interfaces/Push";

export interface MuteConversationProps {
  conversationId: string;
  /**
   * The duration CHOICE (`8h` / `24h` / `1w` / `forever`), or `null` to clear
   * the mute. Never a raw timestamp — the server resolves it and represents
   * "forever" via the returned member's explicit `mutedForever` signal.
   */
  duration: MuteDuration | null;
}

export interface MuteConversationResponse {
  currentMember: ConversationMember;
}

/**
 * Set / clear the logged-in user's conversation mute.
 *
 * Mirrors `POST /:projectId/chat/conversations/:conversationId/mute`. The actor
 * is derived from the user token (Rule A) — a user only mutes their own
 * membership, so there is no `userId` param.
 */
export async function muteConversation(
  client: SublayHttpClient,
  data: MuteConversationProps
): Promise<MuteConversationResponse> {
  const { conversationId, duration } = data;
  const response =
    await client.projectInstance.post<MuteConversationResponse>(
      `/chat/conversations/${conversationId}/mute`,
      { duration }
    );
  return response.data;
}
