import { useCallback } from "react";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import {
  GrantSummary,
  ReputationGrant,
  ReputationGrantTargetFilter,
} from "../../interfaces/models/ReputationGrant";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";

interface FetchManyReputationGrantsBaseProps
  extends SpaceReputationContextParams {
  page?: number;
  limit?: number; // capped at 100 server-side
  /** What this user received. */
  recipientId?: string;
  /** What this user sent. */
  senderId?: string;
  /** Associations to expand. Only `"user"` is supported (hydrates both parties). */
  include?: string | string[];
}

/**
 * The third filter shape — "who rewarded this item" — is the
 * {@link ReputationGrantTargetFilter} pair, so a half-filled target is a
 * compile error rather than a `400 reputation-grant/invalid-filter`. The
 * runtime check inside the hook stays as the defense for plain-JS callers.
 *
 * Mutual exclusivity between the three shapes is NOT expressed in the type: a
 * three-way exclusive union would multiply out across every pagination and
 * space-reputation field and make the props unreadable, for a rule the hook
 * already reports at runtime. Only the both-or-neither pairing is typed.
 */
export type FetchManyReputationGrantsProps =
  FetchManyReputationGrantsBaseProps & ReputationGrantTargetFilter;

/**
 * The `summary` block rides alongside the page envelope, and only on the
 * target filter shape — a "who rewarded this" view would otherwise have to
 * fetch the parent entity/comment/message just to learn the totals.
 */
export interface FetchManyReputationGrantsResponse
  extends PaginatedResponse<ReputationGrant> {
  summary?: GrantSummary;
}

/**
 * Lists reputation grants.
 *
 * Exactly one filter shape per request — `recipientId`, `senderId`, or
 * `targetType` + `targetId`. Combining two is rejected rather than AND-ed,
 * which is what keeps the `summary` block honest.
 *
 * Only positive grants are ever returned, for every caller: negative grants are
 * app moderation deductions and are unreadable from this surface.
 */
function useFetchManyReputationGrants(): (
  props?: FetchManyReputationGrantsProps
) => Promise<FetchManyReputationGrantsResponse> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchManyReputationGrants = useCallback(
    async (props?: FetchManyReputationGrantsProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const { recipientId, senderId, targetType, targetId } = props ?? {};

      // Both server-side rules, mirrored locally so a malformed filter fails
      // before the round trip rather than as a 400.
      if (Boolean(targetType) !== Boolean(targetId)) {
        throw new Error("targetType and targetId must be supplied together.");
      }

      const shapes = [
        Boolean(recipientId),
        Boolean(senderId),
        Boolean(targetType && targetId),
      ].filter(Boolean).length;

      if (shapes === 0) {
        throw new Error(
          "One filter is required: recipientId, senderId, or targetType + targetId."
        );
      }
      if (shapes > 1) {
        throw new Error(
          "Filters are mutually exclusive: supply recipientId, senderId, or targetType + targetId — not more than one."
        );
      }

      const params: Record<string, any> = {};

      if (props?.page !== undefined) params.page = props.page;
      if (props?.limit !== undefined) params.limit = props.limit;
      if (recipientId) params.recipientId = recipientId;
      if (senderId) params.senderId = senderId;
      if (targetType && targetId) {
        params.targetType = targetType;
        params.targetId = targetId;
      }
      if (props?.include) {
        params.include = Array.isArray(props.include)
          ? props.include.join(",")
          : props.include;
      }
      // `spaceReputationId=context` scores each hydrated user against THAT
      // GRANT'S own bucket, so the context variant is the right one here.
      // Normalized rather than spread raw — an un-normalized `spaceReputation`
      // object would be bracket-encoded by axios and silently ignored.
      Object.assign(
        params,
        buildSpaceReputationParams({
          spaceReputation: props?.spaceReputation,
          spaceReputationId: props?.spaceReputationId,
          spaceReputationDescendants: props?.spaceReputationDescendants,
        })
      );

      const response = await axios.get<FetchManyReputationGrantsResponse>(
        `/${projectId}/reputation-grants`,
        { params }
      );

      return response.data;
    },
    [projectId, axios]
  );

  return fetchManyReputationGrants;
}

export default useFetchManyReputationGrants;
