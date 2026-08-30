import { SublayHttpClient } from "../../core/client";

export interface LeaveConversationProps {
  conversationId: string;
}

export async function leaveConversation(
  client: SublayHttpClient,
  data: LeaveConversationProps
): Promise<{ message: string }> {
  const { conversationId } = data;
  const response = await client.projectInstance.delete<{ message: string }>(
    `/chat/conversations/${conversationId}/leave`
  );
  return response.data;
}
