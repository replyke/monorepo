import { ReplykeHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface ListMessagesProps {
  conversationId: string;
  page?: number;
  limit?: number;
}

export async function listMessages(
  client: ReplykeHttpClient,
  data: ListMessagesProps
): Promise<PaginatedResponse<ChatMessage>> {
  const { conversationId, ...params } = data;
  const response = await client.projectInstance.get<
    PaginatedResponse<ChatMessage>
  >(`/chat/conversations/${conversationId}/messages`, { params });
  return response.data;
}
