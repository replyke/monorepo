import { ReplykeHttpClient } from "../../core/client";

export interface DeleteMessageProps {
  conversationId: string;
  messageId: string;
}

export async function deleteMessage(
  client: ReplykeHttpClient,
  data: DeleteMessageProps
): Promise<void> {
  const { conversationId, messageId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/messages/${messageId}`
  );
}
