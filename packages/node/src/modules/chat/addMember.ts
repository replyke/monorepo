import { SublayHttpClient } from "../../core/client";
import { ConversationMember } from "../../interfaces/ConversationMember";

export interface AddMemberProps {
  conversationId: string;
  /** The member to add (the target). */
  userId: string;
  /** The acting caller (must be a group admin). Service key required to name a user. */
  actingUserId: string;
}

export async function addMember(
  client: SublayHttpClient,
  data: AddMemberProps
): Promise<ConversationMember> {
  const { conversationId, userId, actingUserId } = data;
  const response = await client.projectInstance.post<ConversationMember>(
    `/chat/conversations/${conversationId}/members`,
    { userId, actingUserId }
  );
  return response.data;
}
