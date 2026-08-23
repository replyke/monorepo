export interface PushDeviceResult {
  platform: string;
  success: boolean;
  reason?: string;
}

export interface SendPushResult {
  results: Record<string, PushDeviceResult[]>;
}

/**
 * Every push event type — the full app-notification type set plus the chat
 * `message` event (push-only). Mirrors the server's `PUSH_EVENT_TYPES` exactly
 * (server `src/constants/push/pushEvents.ts`); these are the only names a
 * `disabledTypes` set may contain.
 */
export const PUSH_EVENT_TYPES = [
  "entity-comment",
  "comment-reply",
  "entity-mention",
  "comment-mention",
  "entity-reaction",
  "comment-reaction",
  "entity-reaction-milestone-specific",
  "entity-reaction-milestone-total",
  "comment-reaction-milestone-specific",
  "comment-reaction-milestone-total",
  "new-follow",
  "connection-request",
  "connection-accepted",
  "space-membership-approved",
  "event-invite",
  "event-updated",
  "event-cancelled",
  "message",
] as const;

export type PushEventType = (typeof PUSH_EVENT_TYPES)[number];

/**
 * The four client-facing conversation-mute duration choices. Send the CHOICE,
 * never a raw timestamp — the server resolves it and represents "forever" via
 * the explicit `mutedForever` signal on the returned member. Mirrors the
 * server's `MUTE_DURATIONS` (server `src/helpers/push/muteDuration.ts`).
 */
export const MUTE_DURATIONS = ["8h", "24h", "1w", "forever"] as const;

export type MuteDuration = (typeof MUTE_DURATIONS)[number];

/** Response of read/update notification preferences. */
export interface NotificationPreferences {
  disabledTypes: PushEventType[];
}

/**
 * A Web Push subscription in its SERIALIZED form — the JSON the server reads,
 * not the live browser object.
 *
 * A `PushSubscription` straight from `PushManager.subscribe()` does NOT satisfy
 * this type. It exposes its keys only through `getKey(name)`; there is no `keys`
 * property to read, so it is not assignable here under strict TypeScript, and
 * passing one through a cast sends a body the server rejects.
 *
 * To produce a value of this type:
 *
 * 1. **Serialize** the subscription with `subscription.toJSON()`.
 * 2. **Confirm** `endpoint`, `keys.p256dh` and `keys.auth` are all present —
 *    `PushSubscriptionJSON` types every one of them as optional, while the
 *    server requires all three as non-empty strings and 400s otherwise.
 *
 * ```ts
 * const json = subscription.toJSON();
 * if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
 *   throw new Error("Incomplete Web Push subscription");
 * }
 * const webPushSubscription: WebPushSubscription = {
 *   endpoint: json.endpoint,
 *   keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
 * };
 * ```
 *
 * Mirrors the server's `webPushSubscriptionSchema`
 * (server `src/v7/validation/push-notifications/push-notifications.schema.ts`).
 *
 * On this server-side SDK the value normally arrives already serialized, from
 * the browser client that created the subscription — the steps above are what
 * that client must do before sending it to you, and the same checks are worth
 * repeating on receipt.
 */
export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Identifies one physical device. Mirrors the server's device-identifier body
 * exactly (server `src/v7/validation/push-notifications/push-notifications.schema.ts`):
 * a provider token for `ios`/`android`, a Web Push subscription for `web`. The
 * union encodes the server's own cross-check — it rejects the same
 * combinations the server's `superRefine` rejects.
 *
 * Passed to `auth.signOut` to unbind that device's push binding in the same
 * transaction as the sign-out.
 */
export type PushDeviceIdentifier =
  | { platform: "ios" | "android"; token: string }
  | { platform: "web"; subscription: WebPushSubscription };
