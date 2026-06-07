import { SublayHttpClient } from "../../core/client";
import { ConversationPreview } from "../../interfaces/Conversation";

export interface ListConversationsProps {
  /** The user whose conversations are listed. Service key required to name a user. */
  userId: string;
  /** Comma-separated conversation types, e.g. "direct,group,space". */
  types?: string;
  /** Cursor for keyset pagination: the `lastMessageAt` of the last item from the previous page. */
  cursor?: string;
  /** Tie-breaker cursor: the `createdAt` of the last item from the previous page. */
  cursorCreatedAt?: string;
  limit?: number;
}

export interface ListConversationsResponse {
  conversations: ConversationPreview[];
  hasMore: boolean;
}

export async function listConversations(
  client: SublayHttpClient,
  data: ListConversationsProps
): Promise<ListConversationsResponse> {
  const response = await client.projectInstance.get<ListConversationsResponse>(
    "/chat/conversations",
    { params: data }
  );
  return response.data;
}
