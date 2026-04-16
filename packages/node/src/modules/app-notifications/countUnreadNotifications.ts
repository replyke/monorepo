import { ReplykeHttpClient } from "../../core/client";

export interface UnreadNotificationsCountResponse {
  count: number;
}

export async function countUnreadNotifications(
  client: ReplykeHttpClient
): Promise<UnreadNotificationsCountResponse> {
  const response =
    await client.projectInstance.get<UnreadNotificationsCountResponse>(
      "/app-notifications/count"
    );
  return response.data;
}
