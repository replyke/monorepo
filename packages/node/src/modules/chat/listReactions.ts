import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { PaginationMetadata } from "../../interfaces/IPaginatedResponse";

export interface ListReactionsProps extends SpaceReputationContextParams {
  conversationId: string;
  messageId: string;
  /** The reaction emoji to list reactors for (required). */
  emoji: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
  page?: number;
  limit?: number;
}

export interface MessageReaction {
  emoji: string;
  user: User;
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
