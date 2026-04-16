import { ReplykeHttpClient } from "../../core/client";

export interface MarkAllNotificationsAsReadResponse {
  updated: number;
}

export async function markAllNotificationsAsRead(
  client: ReplykeHttpClient
): Promise<MarkAllNotificationsAsReadResponse> {
  const response =
    await client.projectInstance.patch<MarkAllNotificationsAsReadResponse>(
      "/app-notifications/mark-all-as-read"
    );
  return response.data;
}
