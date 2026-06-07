import { SublayHttpClient } from "../../core/client";

export interface RemoveMemberProps {
  conversationId: string;
  /** The member to remove (the target). */
  userId: string;
  /** The acting caller (must be a group admin). Service key required to name a user. */
  actingUserId: string;
}

export async function removeMember(
  client: SublayHttpClient,
  data: RemoveMemberProps
): Promise<void> {
  const { conversationId, userId, actingUserId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/members/${userId}`,
    { params: { actingUserId } }
  );
}
