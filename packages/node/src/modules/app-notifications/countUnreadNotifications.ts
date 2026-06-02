import { SublayHttpClient } from "../../core/client";

export interface UnreadNotificationsCountResponse {
  count: number;
}

export async function countUnreadNotifications(
  client: SublayHttpClient
): Promise<UnreadNotificationsCountResponse> {
  const response =
    await client.projectInstance.get<UnreadNotificationsCountResponse>(
      "/app-notifications/count"
    );
  return response.data;
}
