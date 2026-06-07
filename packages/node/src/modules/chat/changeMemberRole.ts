import { SublayHttpClient } from "../../core/client";
import { ConversationMember, ConversationMemberRole } from "../../interfaces/ConversationMember";

export interface ChangeMemberRoleProps {
  conversationId: string;
  /** The member whose role changes (the target). */
  userId: string;
  role: ConversationMemberRole;
  /** The acting caller (must be a group admin). Service key required to name a user. */
  actingUserId: string;
}

export async function changeMemberRole(
  client: SublayHttpClient,
  data: ChangeMemberRoleProps
): Promise<ConversationMember> {
  const { conversationId, userId, role, actingUserId } = data;
  const response = await client.projectInstance.patch<ConversationMember>(
    `/chat/conversations/${conversationId}/members/${userId}/role`,
    { role, actingUserId }
  );
  return response.data;
}
