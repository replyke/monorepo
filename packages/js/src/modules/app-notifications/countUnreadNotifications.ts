import { SublayHttpClient } from "../../core/client";

export async function countUnreadNotifications(
  client: SublayHttpClient
): Promise<number> {
  const response = await client.projectInstance.get<number>(
    "/app-notifications/count"
  );
  return response.data;
}
