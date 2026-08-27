/**
 * Shared optional params for opting embedded/returned users into a
 * space-scoped reputation value (`spaceReputation`; see
 * {@link import("./User").UserFull}).
 *
 * Two variants exist because the server accepts a different value set per
 * endpoint class:
 * - {@link SpaceReputationContextParams} — context endpoints (entities,
 *   comments, chat, spaces team/members, search, reports). Accept
 *   `<uuid> | "none" | "context"`.
 * - {@link SpaceReputationUserParams} — user-direct endpoints (the `users`
 *   module). Accept `<uuid> | "none"` only; `"context"` is rejected (400).
 *
 * Both classes share the same param names and types — only the accepted
 * `spaceId` value set (documented in JSDoc) differs.
 *
 * **Preferred form:** pass the `spaceReputation` object (`{ spaceId,
 * includeDescendants? }`). The flat props (`spaceReputationId` /
 * `spaceReputationDescendants`) are `@deprecated` but still accepted; when both
 * forms are supplied the object wins. The object is normalized to the flat wire
 * params by `buildSpaceReputationParams` before it reaches the request — it must
 * never be forwarded to axios `params` un-normalized (axios would bracket-encode
 * it and the server would ignore it).
 */

/**
 * Space-reputation params for endpoints whose controllers enrich users from the
 * *current request context* (entities, comments, chat, spaces team/members,
 * search, reports).
 */
export interface SpaceReputationContextParams {
  /**
   * Opt the returned/embedded user(s) into a space-scoped `spaceReputation`.
   * Accepted `spaceId` forms:
   * - a space `<uuid>` — reputation scoped to that specific space
   * - `"none"` — the user's global, non-space reputation
   * - `"context"` — reputation scoped to each row's own space (per-row)
   *
   * `includeDescendants` includes reputation accrued in descendant spaces; only
   * honored when `spaceId` is an explicit `<uuid>`.
   */
  spaceReputation?: {
    spaceId: string | "none" | "context";
    includeDescendants?: boolean;
  };
  /**
   * @deprecated Pass `spaceReputation` instead. Retained for back-compat.
   * Opt the returned/embedded user(s) into a space-scoped `spaceReputation`.
   * Accepted forms:
   * - a space `<uuid>` — reputation scoped to that specific space
   * - `"none"` — the user's global, non-space reputation
   * - `"context"` — reputation scoped to each row's own space (per-row)
   */
  spaceReputationId?: string;
  /**
   * @deprecated Pass `spaceReputation.includeDescendants` instead. Retained for
   * back-compat. Include reputation accrued in descendant spaces. Only honored
   * when `spaceReputationId` is an explicit `<uuid>`; ignored for `"none"` and
   * disallowed (not applicable) with `"context"`.
   */
  spaceReputationDescendants?: boolean;
}

/**
 * Space-reputation params for user-direct endpoints (e.g. `/users/:id`,
 * `/users/by-username`, `/users/:id/followers`). Same fields as
 * {@link SpaceReputationContextParams}, but `"context"` is rejected by the
 * server (400) on these routes — only a `<uuid>` or `"none"` is valid.
 */
export interface SpaceReputationUserParams {
  /**
   * Opt the returned user(s) into a space-scoped `spaceReputation`.
   * Accepted `spaceId` forms:
   * - a space `<uuid>` — reputation scoped to that specific space
   * - `"none"` — the user's global, non-space reputation
   *
   * Note: `"context"` is rejected by the server (400) on user-direct routes;
   * pass an explicit `<uuid>` or `"none"` here.
   *
   * `includeDescendants` includes reputation accrued in descendant spaces; only
   * honored when `spaceId` is an explicit `<uuid>`.
   */
  spaceReputation?: {
    spaceId: string | "none";
    includeDescendants?: boolean;
  };
  /**
   * @deprecated Pass `spaceReputation` instead. Retained for back-compat.
   * Opt the returned user(s) into a space-scoped `spaceReputation`.
   * Accepted forms:
   * - a space `<uuid>` — reputation scoped to that specific space
   * - `"none"` — the user's global, non-space reputation
   */
  spaceReputationId?: string;
  /**
   * @deprecated Pass `spaceReputation.includeDescendants` instead. Retained for
   * back-compat. Include reputation accrued in descendant spaces. Only honored
   * when `spaceReputationId` is an explicit `<uuid>`; ignored for `"none"`.
   */
  spaceReputationDescendants?: boolean;
}
