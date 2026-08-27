import { PUSH_EVENT_TYPES, PushEventType } from "../src/interfaces/Push";

/**
 * A hand-copied snapshot of the server's `PUSH_EVENT_TYPES`
 * (server `src/constants/push/pushEvents.ts`) — names AND order.
 *
 * Nothing links the two lists at build time: the SDK can't import from the
 * server, and the server's own compile-time exhaustiveness check only guards
 * its array against its own union. So the mirror has drifted silently before —
 * `reputation-grant` shipped server-side and was missing here, which made
 * `["reputation-grant"]` an invalid `disabledTypes` value and hid the type from
 * any settings UI built by iterating this list.
 *
 * When the server adds a type, add it here in the server's position and to
 * `PUSH_EVENT_TYPES` in the same commit.
 */
const SERVER_PUSH_EVENT_TYPES = [
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
];

describe("PUSH_EVENT_TYPES", () => {
  it("mirrors the server's list exactly — same names, same order", () => {
    expect([...PUSH_EVENT_TYPES]).toEqual(SERVER_PUSH_EVENT_TYPES);
  });

  it("includes reputation-grant, so a grant push can be muted like any other type", () => {
    // PRD req 21: the type must be registered client-side too, or a caller
    // can never put it in `disabledTypes` without a cast.
    expect(PUSH_EVENT_TYPES).toContain("reputation-grant");

    // Type-level half of the same guarantee: this line stops compiling if
    // "reputation-grant" is not a member of the union.
    const disabledTypes: PushEventType[] = ["reputation-grant"];
    expect(disabledTypes).toEqual(["reputation-grant"]);
  });

  it("has no duplicates", () => {
    expect(new Set(PUSH_EVENT_TYPES).size).toBe(PUSH_EVENT_TYPES.length);
  });
});
