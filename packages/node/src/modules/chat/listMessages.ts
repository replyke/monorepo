import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface MessageFilters {
  /**
   * Filter to messages that have thread replies (not quotings). `true` returns
   * only messages with at least one thread reply; `false` returns only messages
   * with none. Omit for no reply-count filtering.
   */
  hasReplies?: boolean;
}

export interface ListMessagesProps extends SpaceReputationContextParams {
  conversationId: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
  /** Restrict to replies of this message (thread view). */
  parentId?: string;
  /** Keyset pagination: ISO timestamp; return messages created before this. Mutually exclusive with `after`. */
  before?: string;
  /** Keyset pagination: ISO timestamp; return messages created after this. Mutually exclusive with `before`. */
  after?: string;
  limit?: number;
  sort?: "asc" | "desc";
  /** Comma-separated associations to populate, e.g. "files". */
  include?: string;
  /** Optional filters, e.g. `{ hasReplies: true }`. */
  filters?: MessageFilters;
}

export interface ListMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
  /**
   * Present only when a filter combination can't return results — e.g.
   * `hasReplies: true` together with `parentId` (thread replies are one level
   * deep and never have their own replies).
   */
  notice?: string;
}

export async function listMessages(
  client: SublayHttpClient,
  data: ListMessagesProps
): Promise<ListMessagesResponse> {
  const { conversationId, ...params } = data;
  const response = await client.projectInstance.get<ListMessagesResponse>(
    `/chat/conversations/${conversationId}/messages`,
    { params }
  );
  return response.data;
}
