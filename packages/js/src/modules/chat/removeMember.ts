import { SublayHttpClient } from "../../core/client";

export interface RemoveMemberProps {
  conversationId: string;
  /** The member to remove (the target). */
  userId: string;
}

export async function removeMember(
  client: SublayHttpClient,
  data: RemoveMemberProps
): Promise<{ message: string }> {
  const { conversationId, userId } = data;
  const response = await client.projectInstance.delete<{ message: string }>(
    `/chat/conversations/${conversationId}/members/${userId}`
  );
  return response.data;
}
