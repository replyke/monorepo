import { SublayHttpClient } from "../../core/client";
import {
  GrantSummary,
  ReputationGrant,
  ReputationGrantTargetFilter,
} from "../../interfaces/ReputationGrant";
import { PaginatedResponse } from "../../interfaces/IPaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../core/spaceReputationParams";

interface ListGrantsBaseProps extends SpaceReputationContextParams {
  page?: number;
  limit?: number; // capped at 100 server-side

  // ── Filters — exactly ONE shape per request ─────────────────────────────
  /** What this user received. */
  recipientId?: string;
  /** What this user sent. */
  senderId?: string;

  /** Associations to expand. Only `"user"` is supported (hydrates both parties). */
  include?: string;
}

/**
 * The third filter shape — "who rewarded this item" — is the
 * {@link ReputationGrantTargetFilter} pair, so a half-filled target is a
 * compile error rather than a `400 reputation-grant/invalid-filter`.
 *
 * Mutual exclusivity between the three shapes is NOT expressed in the type: a
 * three-way exclusive union would multiply out across every pagination and
 * space-reputation field and make the props unreadable, for a rule the server
 * reports clearly. Only the both-or-neither pairing is typed.
 */
export type ListGrantsProps = ListGrantsBaseProps & ReputationGrantTargetFilter;

/**
 * The `summary` block rides alongside the page envelope, and only on the
 * target filter shape.
 */
export interface ListGrantsResponse extends PaginatedResponse<ReputationGrant> {
  summary?: GrantSummary;
}

/**
 * Lists reputation grants.
 *
 * Exactly one filter shape per request — `recipientId`, `senderId`, or
 * `targetType` + `targetId`. Supplying none or combining two is a `400`; the
 * shapes are not AND-ed, which is what keeps the `summary` block reconcilable
 * with the rows beneath it.
 *
 * Only positive grants are ever returned — for a service key exactly as for a
 * user token. Negative grants are app moderation deductions and are readable
 * only from the dashboard.
 */
export async function listGrants(
  client: SublayHttpClient,
  data: ListGrantsProps
): Promise<ListGrantsResponse> {
  const {
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
    ...rest
  } = data;
  const response = await client.projectInstance.get<ListGrantsResponse>(
    "/reputation-grants",
    {
      params: {
        ...rest,
        // `spaceReputationId=context` scores each hydrated user against THAT
        // GRANT'S own bucket. Normalized rather than spread raw — axios would
        // bracket-encode the object and the server would ignore it.
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      },
    }
  );
  return response.data;
}
