import { SublayHttpClient } from "../../core/client";

export interface MarkAllNotificationsAsReadProps {
  userId: string;
}

export interface MarkAllNotificationsAsReadResponse {
  markedAsRead: number;
}

export async function markAllNotificationsAsRead(
  client: SublayHttpClient,
  data: MarkAllNotificationsAsReadProps
): Promise<MarkAllNotificationsAsReadResponse> {
  const response =
    await client.projectInstance.patch<MarkAllNotificationsAsReadResponse>(
      "/app-notifications/mark-all-as-read",
      { userId: data.userId }
    );
  return response.data;
}
