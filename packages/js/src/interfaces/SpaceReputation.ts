/**
 * Shared optional params for opting a request into space-scoped reputation
 * enrichment. When set, users embedded in the response carry a
 * `spaceReputation` field (see {@link import("./User").UserFull}).
 *
 * Two variants exist because the server accepts a different value set per
 * endpoint class:
 * - {@link SpaceReputationContextParams} — context endpoints (entities,
 *   comments, chat, spaces, search, reports). Accept `<uuid> | "none" |
 *   "context"`.
 * - {@link SpaceReputationUserParams} — user-direct endpoints (the `users`
 *   module). Accept `<uuid> | "none"` only; `"context"` is rejected by the
 *   server (400).
 *
 * Both classes share the same param names and types — only the accepted
 * `spaceReputationId` value set (documented in JSDoc) differs.
 */

/**
 * Space-reputation params for **context** endpoints.
 */
export interface SpaceReputationContextParams {
  /**
   * Opt into space-scoped reputation enrichment. The primary form: an object
   * describing the space and whether to include descendants.
   *
   * - `spaceId` — a space `<uuid>` (reputation within that specific space),
   *   `"none"` (no space context — global reputation only), or `"context"`
   *   (derive the space from each record's own context, e.g. a feed enriches
   *   each row's author with reputation in that row's space).
   * - `includeDescendants` — whether to include descendant spaces when
   *   computing space-scoped reputation. Only honored with an explicit space
   *   `<uuid>` (ignored for `"none"` / `"context"`).
   */
  spaceReputation?: {
    spaceId: string | "none" | "context";
    includeDescendants?: boolean;
  };
  /**
   * @deprecated Pass the `spaceReputation` object instead. Retained for
   * back-compat; removal is a later major version.
   *
   * Opt into space-scoped reputation enrichment. Accepted forms:
   * - a space `<uuid>` — reputation within that specific space;
   * - `"none"` — no space context (global reputation only);
   * - `"context"` — derive the space from each record's own context
   *   (e.g. a feed enriches each row's author with reputation in that row's
   *   space).
   */
  spaceReputationId?: string;
  /**
   * @deprecated Pass the `spaceReputation` object (`includeDescendants`)
   * instead. Retained for back-compat; removal is a later major version.
   *
   * Whether to include descendant spaces when computing space-scoped
   * reputation. Only honored with an explicit space `<uuid>` (ignored for
   * `"none"` / `"context"`).
   */
  spaceReputationDescendants?: boolean;
}

/**
 * Space-reputation params for **user-direct** endpoints (the `users` module).
 */
export interface SpaceReputationUserParams {
  /**
   * Opt into space-scoped reputation enrichment. The primary form: an object
   * describing the space and whether to include descendants.
   *
   * - `spaceId` — a space `<uuid>` (reputation within that specific space) or
   *   `"none"` (no space context — global reputation only). `"context"` is
   *   **rejected by the server (400)** on user-direct endpoints — there is no
   *   per-record context to derive a space from.
   * - `includeDescendants` — whether to include descendant spaces when
   *   computing space-scoped reputation. Only honored with an explicit space
   *   `<uuid>`.
   */
  spaceReputation?: {
    spaceId: string | "none";
    includeDescendants?: boolean;
  };
  /**
   * @deprecated Pass the `spaceReputation` object instead. Retained for
   * back-compat; removal is a later major version.
   *
   * Opt into space-scoped reputation enrichment. Accepted forms:
   * - a space `<uuid>` — reputation within that specific space;
   * - `"none"` — no space context (global reputation only).
   *
   * `"context"` is **rejected by the server (400)** on user-direct endpoints —
   * there is no per-record context to derive a space from.
   */
  spaceReputationId?: string;
  /**
   * @deprecated Pass the `spaceReputation` object (`includeDescendants`)
   * instead. Retained for back-compat; removal is a later major version.
   *
   * Whether to include descendant spaces when computing space-scoped
   * reputation. Only honored with an explicit space `<uuid>`.
   */
  spaceReputationDescendants?: boolean;
}
