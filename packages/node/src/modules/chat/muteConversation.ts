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
  /**
   * The acting user whose membership is muted. The service key acts on this
   * user's behalf; the returned `currentMember` reflects that user's row.
   */
  userId: string;
}

export interface MuteConversationResult {
  currentMember: ConversationMember;
}

/**
 * Set / clear a user's conversation mute.
 *
 * Mirrors `POST /:projectId/chat/conversations/:conversationId/mute`. The route
 * is acting-user-scoped; the SDK authenticates with a service key and names the
 * acting user via `userId` (like the other per-user operations).
 */
export async function muteConversation(
  client: SublayHttpClient,
  data: MuteConversationProps
): Promise<MuteConversationResult> {
  const { conversationId, duration, userId } = data;
  const response =
    await client.projectInstance.post<MuteConversationResult>(
      `/chat/conversations/${conversationId}/mute`,
      { duration, userId }
    );
  return response.data;
}
