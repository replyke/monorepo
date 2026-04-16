import { ReplykeHttpClient } from "../../core/client";

export interface UnreadCountResponse {
  count: number;
}

export async function getUnreadCount(
  client: ReplykeHttpClient
): Promise<UnreadCountResponse> {
  const response = await client.projectInstance.get<UnreadCountResponse>(
    "/chat/conversations/unread-count"
  );
  return response.data;
}
