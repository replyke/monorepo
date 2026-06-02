import { SublayHttpClient } from "../../core/client";

export interface RemoveMemberProps {
  conversationId: string;
  userId: string;
}

export async function removeMember(
  client: SublayHttpClient,
  data: RemoveMemberProps
): Promise<void> {
  const { conversationId, userId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/members/${userId}`
  );
}
