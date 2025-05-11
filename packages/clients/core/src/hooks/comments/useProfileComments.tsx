import { useCallback, useEffect, useRef, useState } from "react";
import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";
import { Comment } from "../../interfaces/models/Comment";
import useFetchManyComments from "./useFetchManyComments";
import { handleError } from "../../utils/handleError";

export interface UseProfileCommentsDataProps {
  userId: string | undefined | null;
  limit?: number;
  defaultSortBy?: CommentsSortByOptions;
  includeEntity?: boolean;
}

export interface UseProfileCommentsDataValues {
  comments: Comment[];
  loading: boolean;
  hasMore: boolean;
  sortBy: CommentsSortByOptions | null;
  setSortBy: (newSortBy: CommentsSortByOptions) => void;
  loadMore: () => void;
}

function useProfileCommentsData(
  props: UseProfileCommentsDataProps
): UseProfileCommentsDataValues {
  const { userId, limit = 10, defaultSortBy = "new", includeEntity } = props;
  const fetchManyComments = useFetchManyComments();

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true); // required to trigger rerenders

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true); // required to trigger rerenders

  const [sortBy, setSortBy] = useState<CommentsSortByOptions>(defaultSortBy);
  const [page, setPage] = useState(1);
  const [comments, setComments] = useState<Comment[]>([]);

  const resetComments = useCallback(async () => {
    if (!userId) {
      console.warn(
        "The 'fetch comments' operation was invoked without a valid user and has been aborted."
      );
      return;
    }

    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setPage(1);

      const newComments = await fetchManyComments({
        userId,
        page: 1,
        sortBy,
        limit: 10,
        includeEntity,
      });

      if (newComments) {
        setComments(newComments);
        if (newComments.length < limit) {
          hasMore.current = false;
          setHasMoreState(false);
        }
      }
    } catch (err) {
      handleError(err, "Failed to reset profile comments:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [fetchManyComments, limit, sortBy, userId, includeEntity]);

  const loadMore = () => {
    if (loading.current || !hasMore.current) return;
    setPage((prevPage) => {
      return prevPage + 1;
    });
  };

  useEffect(() => {
    resetComments();
  }, [resetComments]);

  // useEffect to get a new batch of entities
  useEffect(() => {
    const loadMoreComments = async () => {
      loading.current = true;
      setLoadingState(true);
      try {
        const newComments = await fetchManyComments({
          userId,
          page,
          sortBy,
          limit,
          includeEntity,
        });

        if (newComments) {
          setComments((prevComments) => [...prevComments, ...newComments]);
          if (newComments.length < limit) {
            hasMore.current = false;
            setHasMoreState(false);
          }
        }
      } catch (err) {
        handleError(err, "Loading more comments failed:");
      } finally {
        loading.current = false;
        setLoadingState(false);
      }
    };

    // We only load more if th page changed
    if (page > 1 && hasMore.current && !loading.current) {
      loadMoreComments();
    }
  }, [page]);

  return {
    comments,
    loading: loadingState,
    hasMore: hasMoreState,
    sortBy,
    setSortBy,
    loadMore,
  };
}

export default useProfileCommentsData;
