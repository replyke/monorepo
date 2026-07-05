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

export interface MuteConversationResult {
  currentMember: ConversationMember;
}

/**
 * Set / clear the acting user's conversation mute.
 *
 * Mirrors `POST /:projectId/chat/conversations/:conversationId/mute`. This route
 * is acting-user-scoped (a user only mutes their own membership — no
 * service-key impersonation path), so there is no `userId` parameter.
 */
export async function muteConversation(
  client: SublayHttpClient,
  data: MuteConversationProps
): Promise<MuteConversationResult> {
  const { conversationId, duration } = data;
  const response =
    await client.projectInstance.post<MuteConversationResult>(
      `/chat/conversations/${conversationId}/mute`,
      { duration }
    );
  return response.data;
}
