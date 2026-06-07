import { SublayHttpClient } from "../../core/client";

export interface DeleteConversationProps {
  conversationId: string;
}

export interface DeleteConversationResponse {
  message: string;
}

export async function deleteConversation(
  client: SublayHttpClient,
  data: DeleteConversationProps
): Promise<DeleteConversationResponse> {
  const { conversationId } = data;
  const response =
    await client.projectInstance.delete<DeleteConversationResponse>(
      `/chat/conversations/${conversationId}`
    );
  return response.data;
}
