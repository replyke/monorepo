import { SublayHttpClient } from "../../core/client";
import { NotificationPreferences } from "../../interfaces/Push";

/**
 * Read the acting user's push notification preferences (the set of event types
 * disabled for push). Returns an empty `disabledTypes` (all-on) when no
 * preference row exists.
 *
 * Mirrors `GET /:projectId/push-notifications/preferences`. This route is
 * acting-user-scoped (the server reads the authenticated user directly and has
 * no service-key impersonation path), so there is no `userId` parameter.
 */
export async function getNotificationPreferences(
  client: SublayHttpClient
): Promise<NotificationPreferences> {
  const response = await client.projectInstance.get<NotificationPreferences>(
    `/push-notifications/preferences`
  );
  return response.data;
}
