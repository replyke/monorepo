import { useCallback, useEffect, useRef, useState } from "react";
import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";
import { Comment, CommentIncludeParam } from "../../interfaces/models/Comment";
import useFetchManyComments from "./useFetchManyComments";
import { handleError } from "../../utils/handleError";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { BlockedFilter } from "../../interfaces/BlockedFilter";

export interface UseFetchManyCommentsWrapperProps extends SpaceReputationContextParams {
  entityId?: string | null;
  userId?: string | null;
  parentId?: string | null;
  sourceId?: string | null;
  limit?: number;
  include?: CommentIncludeParam;
  defaultSortBy?: CommentsSortByOptions;
  /** Initial sort direction for `sortBy: "createdAt"`. Defaults to `"desc"`. */
  defaultSortDir?: "asc" | "desc";
  blockedFilter?: BlockedFilter | null;
}

export interface UseFetchManyCommentsWrapperValues {
  comments: Comment[];
  loading: boolean;
  hasMore: boolean;
  sortBy: CommentsSortByOptions | null;
  setSortBy: (newSortBy: CommentsSortByOptions) => void;
  /** Sort direction for `sortBy: "createdAt"`. */
  sortDir: "asc" | "desc";
  setSortDir: (newSortDir: "asc" | "desc") => void;
  loadMore: () => void;
}

function useFetchManyCommentsWrapper(
  props: UseFetchManyCommentsWrapperProps
): UseFetchManyCommentsWrapperValues {
  const {
    entityId,
    userId,
    parentId,
    sourceId,
    limit = 10,
    defaultSortBy = "createdAt",
    defaultSortDir = "desc",
    include,
    blockedFilter,
    spaceReputation,
    spaceReputationId,
    spaceReputationDescendants,
  } = props;

  // Forwarded to the leaf fetcher, which flattens it via
  // buildSpaceReputationParams before it reaches the serializer.
  const reputation = { spaceReputation, spaceReputationId, spaceReputationDescendants };
  const reputationKey = JSON.stringify(reputation);

  const fetchManyComments = useFetchManyComments();

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true);

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true);

  const [sortBy, setSortBy] = useState<CommentsSortByOptions>(defaultSortBy);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [page, setPage] = useState(1);
  const [comments, setComments] = useState<Comment[]>([]);

  const resetComments = useCallback(async () => {
    if (!userId && !entityId && !parentId) {
      return;
    }

    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setPage(1);

      const response = await fetchManyComments({
        entityId,
        userId,
        parentId,
        sourceId,
        page: 1,
        sortBy,
        sortDir,
        limit,
        include,
        blockedFilter,
        ...reputation,
      });

      if (response) {
        const { data: newComments, pagination } = response;
        setComments(newComments);
        hasMore.current = pagination.hasMore;
        setHasMoreState(pagination.hasMore);
      }
    } catch (err) {
      handleError(err, "Failed to reset comments:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [
    fetchManyComments,
    limit,
    sortBy,
    sortDir,
    entityId,
    userId,
    parentId,
    sourceId,
    include,
    blockedFilter,
    reputationKey,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => {
      return prevPage + 1;
    });
  };

  useEffect(() => {
    resetComments();
  }, [resetComments]);

  // useEffect to get a new batch of comments
  useEffect(() => {
    const loadMoreComments = async () => {
      loading.current = true;
      setLoadingState(true);
      try {
        const response = await fetchManyComments({
          entityId,
          userId,
          parentId,
          sourceId,
          page,
          sortBy,
          sortDir,
          limit,
          include,
          ...reputation,
        });

        if (response) {
          const { data: newComments, pagination } = response;
          setComments((prevComments) => [...prevComments, ...newComments]);
          hasMore.current = pagination.hasMore;
          setHasMoreState(pagination.hasMore);
        }
      } catch (err) {
        handleError(err, "Loading more comments failed:");
      } finally {
        loading.current = false;
        setLoadingState(false);
      }
    };

    // We only load more if the page changed
    if (page > 1 && hasMore.current && !loading.current) {
      loadMoreComments();
    }
  }, [
    page,
    fetchManyComments,
    entityId,
    userId,
    parentId,
    sourceId,
    sortBy,
    sortDir,
    limit,
    include,
    blockedFilter,
    reputationKey,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    comments,
    loading: loadingState,
    hasMore: hasMoreState,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    loadMore,
  };
}

export default useFetchManyCommentsWrapper;
