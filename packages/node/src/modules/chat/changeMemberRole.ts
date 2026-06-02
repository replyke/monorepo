import { SublayHttpClient } from "../../core/client";
import { ConversationMember, ConversationMemberRole } from "../../interfaces/ConversationMember";

export interface ChangeMemberRoleProps {
  conversationId: string;
  userId: string;
  role: ConversationMemberRole;
}

export async function changeMemberRole(
  client: SublayHttpClient,
  data: ChangeMemberRoleProps
): Promise<ConversationMember> {
  const { conversationId, userId, role } = data;
  const response = await client.projectInstance.patch<ConversationMember>(
    `/chat/conversations/${conversationId}/members/${userId}/role`,
    { role }
  );
  return response.data;
}
