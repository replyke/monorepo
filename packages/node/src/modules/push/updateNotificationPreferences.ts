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
}

/**
 * Upsert the acting user's push notification preferences.
 *
 * Mirrors `PUT /:projectId/push-notifications/preferences`. Acting-user-scoped
 * (no service-key impersonation path), so there is no `userId` parameter.
 */
export async function updateNotificationPreferences(
  client: SublayHttpClient,
  data: UpdateNotificationPreferencesProps
): Promise<NotificationPreferences> {
  const { disabledTypes } = data;
  const response = await client.projectInstance.put<NotificationPreferences>(
    `/push-notifications/preferences`,
    { disabledTypes }
  );
  return response.data;
}
