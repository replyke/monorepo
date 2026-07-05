import { SublayHttpClient } from "../../core/client";
import {
  NotificationPreferences,
  PushEventType,
} from "../../interfaces/Push";

export interface UpdateNotificationPreferencesProps {
  /**
   * The set of push event types the user has opted OUT of. Server-exact type
   * names only (unknown names are rejected server-side); duplicates collapse.
   */
  disabledTypes: PushEventType[];
  /**
   * The acting user whose preferences are written. The service key acts on this
   * user's behalf.
   */
  userId: string;
}

/**
 * Upsert a user's push notification preferences.
 *
 * Mirrors `PUT /:projectId/push-notifications/preferences`. The route is
 * acting-user-scoped; the SDK authenticates with a service key and names the
 * acting user via `userId` (like the other per-user operations).
 */
export async function updateNotificationPreferences(
  client: SublayHttpClient,
  data: UpdateNotificationPreferencesProps
): Promise<NotificationPreferences> {
  const { disabledTypes, userId } = data;
  const response = await client.projectInstance.put<NotificationPreferences>(
    `/push-notifications/preferences`,
    { disabledTypes, userId }
  );
  return response.data;
}
