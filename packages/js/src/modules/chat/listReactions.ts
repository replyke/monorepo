import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { PaginationMetadata } from "../../interfaces/IPaginatedResponse";

export interface ListReactionsProps {
  conversationId: string;
  messageId: string;
  /** The reaction emoji to list reactors for (required). */
  emoji: string;
  /** Page number (default 1). */
  page?: number;
  /** Page size (default 50, max 100). */
  limit?: number;
}

export interface MessageReaction {
  user: User;
  emoji: string;
  createdAt: Date;
}

export interface ListReactionsResponse {
  data: MessageReaction[];
  pagination: PaginationMetadata;
}

export async function listReactions(
  client: SublayHttpClient,
  data: ListReactionsProps
): Promise<ListReactionsResponse> {
  const { conversationId, messageId, ...params } = data;
  const response = await client.projectInstance.get<ListReactionsResponse>(
    `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
    { params }
  );
  return response.data;
}
