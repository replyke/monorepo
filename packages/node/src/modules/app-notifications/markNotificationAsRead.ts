import { ReplykeHttpClient } from "../../core/client";
import { UnifiedAppNotification } from "../../interfaces/AppNotification";

export interface MarkNotificationAsReadProps {
  notificationId: string;
}

export async function markNotificationAsRead(
  client: ReplykeHttpClient,
  data: MarkNotificationAsReadProps
): Promise<UnifiedAppNotification> {
  const { notificationId } = data;
  const response = await client.projectInstance.patch<UnifiedAppNotification>(
    `/app-notifications/${notificationId}/mark-as-read`
  );
  return response.data;
}
