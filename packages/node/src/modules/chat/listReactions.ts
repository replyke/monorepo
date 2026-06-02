import { SublayHttpClient } from "../../core/client";
import { User } from "../../interfaces/User";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface ListReactionsProps {
  conversationId: string;
  messageId: string;
  emoji?: string;
}

export interface MessageReaction {
  emoji: string;
  user: User;
  createdAt: Date;
}

export async function listReactions(
  client: SublayHttpClient,
  data: ListReactionsProps
): Promise<PaginatedResponse<MessageReaction>> {
  const { conversationId, messageId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<MessageReaction>
  >(
    `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
    { params }
  );
  return response.data;
}
