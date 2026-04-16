import { ReplykeHttpClient } from "../../core/client";

export interface DeleteConversationProps {
  conversationId: string;
}

export async function deleteConversation(
  client: ReplykeHttpClient,
  data: DeleteConversationProps
): Promise<void> {
  const { conversationId } = data;
  await client.projectInstance.delete(`/chat/conversations/${conversationId}`);
}
