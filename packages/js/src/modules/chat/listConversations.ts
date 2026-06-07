import { SublayHttpClient } from "../../core/client";
import { ConversationPreview } from "../../interfaces/Conversation";

export interface ListConversationsProps {
  /** Comma-separated conversation types, e.g. "direct,group,space". */
  types?: string;
  /** Cursor for keyset pagination: the `lastMessageAt` of the last item from the previous page (ISO datetime). */
  cursor?: string;
  /** Tie-breaker cursor: the `createdAt` of the last item from the previous page (ISO datetime). */
  cursorCreatedAt?: string;
  /** Default 20, max 50. */
  limit?: number;
}

export interface ListConversationsResponse {
  conversations: ConversationPreview[];
  hasMore: boolean;
}

export async function listConversations(
  client: SublayHttpClient,
  data?: ListConversationsProps
): Promise<ListConversationsResponse> {
  const response = await client.projectInstance.get<ListConversationsResponse>(
    "/chat/conversations",
    { params: data }
  );
  return response.data;
}
