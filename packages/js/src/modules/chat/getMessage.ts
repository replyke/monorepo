import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface GetMessageProps extends SpaceReputationContextParams {
  conversationId: string;
  messageId: string;
  /**
   * Comma-separated associations to populate. Only `"grants"` is supported
   * here — it attaches the message's reputation-grant summary.
   */
  include?: string;
}

export async function getMessage(
  client: SublayHttpClient,
  data: GetMessageProps
): Promise<ChatMessage> {
  const {
    conversationId,
    messageId,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const params = {
    ...rest,
    ...buildSpaceReputationParams({
      spaceReputation,
      spaceReputationId,
      spaceReputationDescendants,
    }),
  };
  const response = await client.projectInstance.get<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    { params }
  );
  return response.data;
}
