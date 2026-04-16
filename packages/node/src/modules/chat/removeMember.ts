import { ReplykeHttpClient } from "../../core/client";

export interface RemoveMemberProps {
  conversationId: string;
  userId: string;
}

export async function removeMember(
  client: ReplykeHttpClient,
  data: RemoveMemberProps
): Promise<void> {
  const { conversationId, userId } = data;
  await client.projectInstance.delete(
    `/chat/conversations/${conversationId}/members/${userId}`
  );
}
