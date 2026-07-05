import { SublayHttpClient } from "../../core/client";
import { NotificationPreferences } from "../../interfaces/Push";

export interface GetNotificationPreferencesProps {
  /**
   * The acting user whose preferences are read. The service key acts on this
   * user's behalf.
   */
  userId: string;
}

/**
 * Read a user's push notification preferences (the set of event types disabled
 * for push). Returns an empty `disabledTypes` (all-on) when no preference row
 * exists.
 *
 * Mirrors `GET /:projectId/push-notifications/preferences`. The route is
 * acting-user-scoped; the SDK authenticates with a service key and names the
 * acting user via the `userId` query param (like the other per-user reads).
 */
export async function getNotificationPreferences(
  client: SublayHttpClient,
  data: GetNotificationPreferencesProps
): Promise<NotificationPreferences> {
  const response = await client.projectInstance.get<NotificationPreferences>(
    `/push-notifications/preferences`,
    { params: { userId: data.userId } }
  );
  return response.data;
}
