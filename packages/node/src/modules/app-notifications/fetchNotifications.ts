import { ReplykeHttpClient } from "../../core/client";
import { UnifiedAppNotification } from "../../interfaces/AppNotification";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";

export interface FetchNotificationsProps {
  page?: number;
  limit?: number;
}

export async function fetchNotifications(
  client: ReplykeHttpClient,
  data: FetchNotificationsProps
): Promise<PaginatedResponse<UnifiedAppNotification>> {
  const response = await client.projectInstance.get<
    PaginatedResponse<UnifiedAppNotification>
  >("/app-notifications", { params: data });
  return response.data;
}
