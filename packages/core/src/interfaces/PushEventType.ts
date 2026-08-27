/**
 * The authoritative, ordered list of every push event type — the full
 * app-notification type set plus the chat `message` event (push-only).
 *
 * This mirrors the server's `PUSH_EVENT_TYPES` (see server
 * `src/constants/push/pushEvents.ts`) EXACTLY — same names, same order, no
 * aliases or renames ("SDK mirrors server exactly"). These are the only names
 * accepted in a `disabledTypes` set for notification preferences.
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
  "reputation-grant",
  "message",
] as const;

export type PushEventType = (typeof PUSH_EVENT_TYPES)[number];
