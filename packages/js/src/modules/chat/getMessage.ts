import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";

export interface GetMessageProps extends SpaceReputationContextParams {
  conversationId: string;
  messageId: string;
}

export async function getMessage(
  client: SublayHttpClient,
  data: GetMessageProps
): Promise<ChatMessage> {
  const { conversationId, messageId, ...params } = data;
  const response = await client.projectInstance.get<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    { params }
  );
  return response.data;
}
