import { User } from "./User";

/** The three grantable target kinds. Polymorphic — `targetId` carries no FK. */
export type ReputationGrantTargetType = "entity" | "comment" | "chat-message";

/**
 * Who created the grant. `"user"` is a debited transfer (reputation moved out
 * of `senderId`'s bucket); `"app"` is a mint issued by the project itself with
 * a null `senderId`. Persisted rather than inferred from `senderId`, which is
 * also null for a transfer whose sender was later deleted.
 */
export type ReputationGrantSourceType = "user" | "app";

/**
 * The "which item was rewarded" pair, as a both-or-neither union.
 *
 * Modelled as a two-branch union rather than two independent optional fields so
 * a half-filled target — `{ targetType }` with no `targetId`, or the reverse —
 * does not compile. The server answers that shape with
 * `400 reputation-grant/invalid-body` on the writes (a shared
 * `bothOrNeitherTarget` refinement on both bodies) and
 * `400 reputation-grant/invalid-filter` on the list, so the union turns a
 * guaranteed round trip into a red squiggle.
 *
 * The empty branch is `?: undefined`, NOT `?: null` — deliberately, and for the
 * same reason `metadata` is not nullable: `grantBodyFields.targetType` is
 * `.optional()` with no `.nullable()`, so an explicit `targetType: null` is
 * rejected. Omit both keys to mean "no target".
 *
 * Building the pair conditionally needs one accommodation: an inline
 * conditional spread of just these two keys widens both to `T | undefined` and
 * then matches neither branch. Either branch the whole argument, or name this
 * type on a helper and spread that:
 *
 * ```ts
 * const target: ReputationGrantTargetFilter = item
 *   ? { targetType: "entity", targetId: item.id }
 *   : {};
 * await listGrants(client, { ...base, ...target });
 * ```
 */
export type ReputationGrantTargetFilter =
  | {
      /** The kind of item rewarded. Requires `targetId` alongside it. */
      targetType: ReputationGrantTargetType;
      /** The rewarded item's id. Requires `targetType` alongside it. */
      targetId: string;
    }
  | { targetType?: undefined; targetId?: undefined };

/**
 * The fields both grant WRITE bodies carry — {@link CreateGrantProps} (a
 * debited transfer) and {@link MintGrantProps} (a mint). Shared rather than
 * repeated so the `note`/`metadata` nullability asymmetry below is stated once
 * and can only ever be corrected in one place.
 *
 * Everything that differs between the two routes stays on the route's own
 * props: the transfer names its sender (`actingUserId`) and takes a positive
 * amount only, while the mint has no actor and accepts any non-zero amount.
 * This is not a wire body of its own — nothing posts a `GrantWriteCommonProps`.
 */
export interface GrantWriteCommonProps {
  /**
   * The bucket the reputation moves in — both legs on a transfer, the credited
   * (or debited) leg on a mint. Omitted/null = the project-general bucket.
   */
  spaceId?: string | null;
  /**
   * Free-text reason. Trimmed and capped at 2000 characters server-side.
   * Genuinely nullable — an explicit `null` is accepted and means "no note".
   */
  note?: string | null;
  /**
   * Arbitrary JSON, capped at 1 MB server-side.
   *
   * NOT nullable — deliberately asymmetric with `note` directly above, not a
   * typo. The server's shared `metadataSchema` is `z.record(...).optional()`
   * with no `.nullable()`, so an explicit `metadata: null` is rejected with
   * `400 reputation-grant/invalid-body`. Omit the key to mean "no metadata".
   */
  metadata?: Record<string, any>;
}

/**
 * Per-item reputation-grant summary. Covers positive grants only — negative
 * grants (app deductions) are invisible on every public read surface.
 */
export interface GrantSummary {
  /** Sum of positive grant amounts on the item. */
  total: number;
  /** Number of positive grants on the item. */
  count: number;
  /** The calling user's own summed positive grants on the item. */
  viewerTotal: number;
}

/**
 * A single reputation movement. Rows are append-only — nothing updates or
 * soft-deletes them — so the table is the audit log behind every balance.
 */
export interface ReputationGrant {
  id: string;
  sourceType: ReputationGrantSourceType;
  /** Null for an app mint, and for a transfer whose sender was deleted. */
  senderId: string | null;
  /** Populated when the list is called with `include: "user"`. */
  sender?: User | null;
  recipientId: string;
  /** Populated when the list is called with `include: "user"`. */
  recipient?: User | null;
  /** Non-zero. Negative only when `sourceType` is `"app"`. */
  amount: number;
  /** The bucket both legs moved in; null = the project-general bucket. */
  spaceId: string | null;
  /** Both null or both non-null. */
  targetType: ReputationGrantTargetType | null;
  targetId: string | null;
  note: string | null;
  // Nullable on READ (the column is null when the grant was created without
  // metadata) — unlike the create/mint request props, where an explicit null is
  // rejected. Don't "harmonize" the two: they are different directions.
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
