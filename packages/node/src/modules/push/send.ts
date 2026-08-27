import { SublayHttpClient } from "../../core/client";
import { SendPushResult } from "../../interfaces/Push";

export interface SendPushProps {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  /**
   * Sound file to play on the device. iOS plays it directly (APNs `sound`);
   * on Android 8+ the sound is owned by the notification channel, so pair this
   * with `channelId` (the app must create that channel with the sound set);
   * Web forwards it to your service worker.
   */
  sound?: string;
  /** iOS app-icon badge count (APNs `badge`). No Android equivalent. */
  badge?: number;
  /**
   * Android notification channel id (FCM). The channel must be created
   * client-side; on Android 8+ it governs sound, importance, and vibration.
   */
  channelId?: string;
  /**
   * Delivery priority. `high` (default) wakes the device for time-sensitive
   * pushes; `normal` is power-considerate. Maps to APNs `apns-priority` and
   * FCM `android.priority`.
   */
  priority?: "high" | "normal";
  /** iOS subtitle line shown under the title (APNs `alert.subtitle`). */
  subtitle?: string;
  /**
   * Rich/big-picture image URL. Works out of the box on Android (FCM) and Web.
   * On iOS it additionally requires a Notification Service Extension in your
   * app; the URL is forwarded and `mutable-content` is set automatically.
   */
  imageUrl?: string;
  /**
   * Display-replace key so notifications collapse in the UI instead of
   * stacking (FCM `android.notification.tag`, Web `tag`). Use a per-conversation
   * value to keep one entry per thread.
   */
  tag?: string;
  /**
   * Transport-level collapse identifier (APNs `apns-collapse-id`, FCM
   * `collapse_key`) — a newer push supersedes an undelivered one with the same id.
   */
  collapseId?: string;
  /** iOS notification grouping (APNs `thread-id`). */
  threadId?: string;
  /**
   * Time-to-live in seconds for offline devices (APNs `apns-expiration`,
   * FCM `android.ttl`). After this window the provider stops retrying.
   */
  ttl?: number;
  /**
   * iOS `mutable-content` flag, letting your Notification Service Extension
   * modify the payload (e.g. attach `imageUrl`). Set implicitly when `imageUrl`
   * is provided.
   */
  mutableContent?: boolean;
}

export async function send(
  client: SublayHttpClient,
  data: SendPushProps
): Promise<SendPushResult> {
  const path = `/push-notifications/send`;
  const response = await client.projectInstance.post<SendPushResult>(path, data);
  return response.data;
}
