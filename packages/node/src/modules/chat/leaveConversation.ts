import { ReplykeHttpClient } from "../../core/client";

export interface LeaveConversationProps {
  conversationId: string;
}

export async function leaveConversation(
  client: ReplykeHttpClient,
  data: LeaveConversationProps
): Promise<void> {
  const { conversationId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/leave`
  );
}
