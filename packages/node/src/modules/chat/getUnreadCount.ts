import { SublayHttpClient } from "../../core/client";

export interface UnreadCountResponse {
  count: number;
}

export async function getUnreadCount(
  client: SublayHttpClient
): Promise<UnreadCountResponse> {
  const response = await client.projectInstance.get<UnreadCountResponse>(
    "/chat/conversations/unread-count"
  );
  return response.data;
}
