import { SublayHttpClient } from "../../core/client";

export interface DeleteMessageProps {
  conversationId: string;
  messageId: string;
}

export interface DeleteMessageResponse {
  message: string;
  /** Present when the author soft-deletes their own message. */
  userDeletedAt?: string;
}

export async function deleteMessage(
  client: SublayHttpClient,
  data: DeleteMessageProps
): Promise<DeleteMessageResponse> {
  const { conversationId, messageId } = data;
  const response = await client.projectInstance.delete<DeleteMessageResponse>(
    `/chat/conversations/${conversationId}/messages/${messageId}`
  );
  return response.data;
}
