import { SublayHttpClient } from "../../core/client";
import { ConversationMember } from "../../interfaces/ConversationMember";

export interface AddMemberProps {
  conversationId: string;
  userId: string;
}

export async function addMember(
  client: SublayHttpClient,
  data: AddMemberProps
): Promise<ConversationMember> {
  const { conversationId, userId } = data;
  const response = await client.projectInstance.post<ConversationMember>(
    `/chat/conversations/${conversationId}/members`,
    { userId }
  );
  return response.data;
}
