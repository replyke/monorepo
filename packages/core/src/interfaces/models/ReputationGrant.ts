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
 * Per-item reputation-grant summary, attached to an entity, comment or chat
 * message when the read requests `include=grants`. Always covers positive
 * grants only — negative grants (app deductions) are invisible on every public
 * read surface.
 *
 * The server returns a zero-filled summary rather than omitting the field when
 * the project's schema has no grants table, so the shape is stable regardless
 * of bundle state.
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
  /** Populated when the list is called with `include=user`. */
  sender?: User | null;
  recipientId: string;
  /** Populated when the list is called with `include=user`. */
  recipient?: User | null;
  /** Non-zero. Negative only when `sourceType` is `"app"`. */
  amount: number;
  /** The bucket both legs moved in; null = the project-general bucket. */
  spaceId: string | null;
  /** Both null or both non-null. */
  targetType: ReputationGrantTargetType | null;
  targetId: string | null;
  note: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
