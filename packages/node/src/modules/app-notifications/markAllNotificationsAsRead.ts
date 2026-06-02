import { SublayHttpClient } from "../../core/client";

export interface MarkAllNotificationsAsReadResponse {
  updated: number;
}

export async function markAllNotificationsAsRead(
  client: SublayHttpClient
): Promise<MarkAllNotificationsAsReadResponse> {
  const response =
    await client.projectInstance.patch<MarkAllNotificationsAsReadResponse>(
      "/app-notifications/mark-all-as-read"
    );
  return response.data;
}
