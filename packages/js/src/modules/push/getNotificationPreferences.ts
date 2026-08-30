import { SublayHttpClient } from "../../core/client";
import { NotificationPreferences } from "../../interfaces/Push";

/**
 * Read the logged-in user's push notification preferences (the set of event
 * types disabled for push). Returns an empty `disabledTypes` (all-on) when no
 * preference row exists.
 *
 * Mirrors `GET /:projectId/push-notifications/preferences`. The actor is derived
 * from the user token (Rule A) — no `userId` param.
 */
export async function getNotificationPreferences(
  client: SublayHttpClient
): Promise<NotificationPreferences> {
  const response = await client.projectInstance.get<NotificationPreferences>(
    `/push-notifications/preferences`
  );
  return response.data;
}
