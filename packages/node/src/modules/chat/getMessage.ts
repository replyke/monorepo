import { SublayHttpClient } from "../../core/client";
import { ChatMessage } from "../../interfaces/ChatMessage";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

export interface GetMessageProps extends SpaceReputationContextParams {
  conversationId: string;
  messageId: string;
  /** The user to act as (must be a member). Service key required to name a user. */
  userId: string;
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
  const response = await client.projectInstance.get<ChatMessage>(
    `/chat/conversations/${conversationId}/messages/${messageId}`,
    {
      params: {
        ...rest,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
