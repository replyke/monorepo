import { useCallback, useEffect, useRef, useState } from "react";
import {
  GrantSummary,
  NullableReputationGrantTargetFilter,
  ReputationGrant,
} from "../../interfaces/models/ReputationGrant";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import useFetchManyReputationGrants, {
  FetchManyReputationGrantsProps,
} from "./useFetchManyReputationGrants";
import { handleError } from "../../utils/handleError";

interface UseFetchManyReputationGrantsWrapperBaseProps
  extends SpaceReputationContextParams {
  limit?: number;
  /** What this user received. */
  recipientId?: string | null;
  /** What this user sent. */
  senderId?: string | null;
  include?: string | string[];
}

/**
 * The third filter shape — "who rewarded this item" — is the
 * {@link NullableReputationGrantTargetFilter} pair: both fields or neither,
 * with `null` accepted for "neither" because these are React props rather than
 * a wire body. The hook's `canFetch` gate repeats the rule at runtime for
 * plain-JS callers.
 */
export type UseFetchManyReputationGrantsWrapperProps =
  UseFetchManyReputationGrantsWrapperBaseProps &
    NullableReputationGrantTargetFilter;

export interface UseFetchManyReputationGrantsWrapperValues {
  grants: ReputationGrant[];
  /** Only returned by the target filter shape; null otherwise. */
  summary: GrantSummary | null;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  /** Re-run the query from page 1 (e.g. after issuing a grant). */
  refresh: () => void;
}

/**
 * Stateful, paginated list of reputation grants.
 *
 * Modelled on `useFetchManyEventsWrapper`: one `buildParams` memo feeds BOTH
 * the reset path and the load-more path, so a filter can never be applied to
 * page 1 and silently dropped from page 2.
 *
 * The server requires exactly one filter shape, and requires `targetType` and
 * `targetId` to arrive together. With no filter supplied — or with a half-filled
 * target — the hook stays idle rather than issuing a request it knows will 400.
 */
function useFetchManyReputationGrantsWrapper(
  props: UseFetchManyReputationGrantsWrapperProps = {}
): UseFetchManyReputationGrantsWrapperValues {
  const {
    limit = 10,
    recipientId,
    senderId,
    targetType,
    targetId,
    include,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
  } = props;

  // Forwarded to the leaf fetcher, which flattens it via
  // buildSpaceReputationParams before it reaches the serializer. Keyed by its
  // JSON so an inline object literal at the call site doesn't re-arm the
  // effect on every render.
  const reputation = {
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
  };
  const reputationKey = JSON.stringify(reputation);

  const fetchManyReputationGrants = useFetchManyReputationGrants();

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true);

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true);

  const [page, setPage] = useState(1);
  const [grants, setGrants] = useState<ReputationGrant[]>([]);
  const [summary, setSummary] = useState<GrantSummary | null>(null);

  // Collapsed to a primitive up front: `include` is almost always written as
  // an inline array literal at the call site, which is a fresh reference on
  // every render and would otherwise re-arm `buildParams` — and therefore the
  // reset effect — forever.
  const includeParam = Array.isArray(include) ? include.join(",") : include;

  const hasTarget = Boolean(targetType && targetId);
  // A HALF-filled target is its own reason to stay idle, and is not visible in
  // `filterCount`: `{ recipientId, targetType }` counts as one shape, so
  // without this the wrapper would fire, the leaf fetcher would throw the
  // both-or-neither error, and `handleError` would swallow it — a silent
  // no-result list. The types make this unreachable from TypeScript; plain-JS
  // callers land here.
  const halfTarget = Boolean(targetType) !== Boolean(targetId);
  const filterCount = [
    Boolean(recipientId),
    Boolean(senderId),
    hasTarget,
  ].filter(Boolean).length;
  const canFetch = filterCount === 1 && !halfTarget;

  const buildParams = useCallback(
    (pageArg: number): FetchManyReputationGrantsProps => {
      const base = {
        page: pageArg,
        limit,
        recipientId: recipientId ?? undefined,
        senderId: senderId ?? undefined,
        include: includeParam,
        ...reputation,
      };
      // The target pair is attached in one branch rather than as two
      // `?? undefined` fields: spreading them individually would widen both to
      // `T | undefined`, which satisfies neither branch of the leaf's
      // both-or-neither union.
      return targetType && targetId
        ? { ...base, targetType, targetId }
        : base;
    },
    [
      limit,
      recipientId,
      senderId,
      targetType,
      targetId,
      includeParam,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      reputationKey,
    ]
  );

  const resetGrants = useCallback(async () => {
    if (!canFetch) {
      setGrants([]);
      setSummary(null);
      hasMore.current = false;
      setHasMoreState(false);
      loading.current = false;
      setLoadingState(false);
      return;
    }

    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setPage(1);

      const response = await fetchManyReputationGrants(buildParams(1));

      if (response) {
        const { data: newGrants, pagination } = response;
        setGrants(newGrants);
        setSummary(response.summary ?? null);
        hasMore.current = pagination.hasMore;
        setHasMoreState(pagination.hasMore);
      }
    } catch (err) {
      handleError(err, "Failed to reset reputation grants:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [canFetch, fetchManyReputationGrants, buildParams]);

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => prevPage + 1);
  };

  const refresh = () => {
    resetGrants();
  };

  useEffect(() => {
    resetGrants();
  }, [resetGrants]);

  useEffect(() => {
    const loadMoreGrants = async () => {
      loading.current = true;
      setLoadingState(true);
      try {
        const response = await fetchManyReputationGrants(buildParams(page));

        if (response) {
          const { data: newGrants, pagination } = response;
          setGrants((prevGrants) => [...prevGrants, ...newGrants]);
          hasMore.current = pagination.hasMore;
          setHasMoreState(pagination.hasMore);
        }
      } catch (err) {
        handleError(err, "Loading more reputation grants failed:");
      } finally {
        loading.current = false;
        setLoadingState(false);
      }
    };

    // Only load more when the page advances past 1.
    if (canFetch && page > 1 && hasMore.current && !loading.current) {
      loadMoreGrants();
    }
  }, [canFetch, page, fetchManyReputationGrants, buildParams]);

  return {
    grants,
    summary,
    loading: loadingState,
    hasMore: hasMoreState,
    loadMore,
    refresh,
  };
}

export default useFetchManyReputationGrantsWrapper;
