import { ReplykeHttpClient } from "../../core/client";

export interface MarkAsReadProps {
  conversationId: string;
  lastReadAt: string | Date;
}

export async function markAsRead(
  client: ReplykeHttpClient,
  data: MarkAsReadProps
): Promise<void> {
  const { conversationId, lastReadAt } = data;
  await client.projectInstance.post(
    `/chat/conversations/${conversationId}/read`,
    { lastReadAt }
  );
}
