import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";

export interface ListMessagesProps {
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
}

export interface ListMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
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
