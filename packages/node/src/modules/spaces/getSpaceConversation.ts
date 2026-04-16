import { ReplykeHttpClient } from "../../core/client";
import { Conversation } from "../../interfaces/Conversation";

export interface GetSpaceConversationProps {
  spaceId: string;
}

export async function getSpaceConversation(
  client: ReplykeHttpClient,
  data: GetSpaceConversationProps
): Promise<Conversation> {
  const { spaceId } = data;
  const response = await client.projectInstance.get<Conversation>(
    `/spaces/${spaceId}/conversation`
  );
  return response.data;
}
