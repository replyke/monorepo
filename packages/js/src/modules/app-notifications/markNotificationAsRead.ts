import { SublayHttpClient } from "../../core/client";

export interface MarkNotificationAsReadProps {
  notificationId: string;
}

export async function markNotificationAsRead(
  client: SublayHttpClient,
  data: MarkNotificationAsReadProps
): Promise<void> {
  const { notificationId } = data;
  await client.projectInstance.patch(
    `/app-notifications/${notificationId}/mark-as-read`
  );
}
