import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Comment } from "../../interfaces/models/Comment";
import useFetchManyComments from "./useFetchManyComments";
import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";
import { handleError } from "../../utils/handleError";
import { EntityCommentsTree } from "../../interfaces/EntityCommentsTree";
import { addCommentsToTree as addCommentsToTreeHandler } from "../../helpers/addCommentsToTree";
import { removeCommentFromTree as removeCommentFromTreeHandler } from "../../helpers/removeCommentFromTree";

export interface UseEntityCommentsDataProps {
  entityId: string | undefined | null;
  limit?: number;
  defaultSortBy?: CommentsSortByOptions;
}

export interface UseEntityCommentsDataValues {
  entityCommentsTree: EntityCommentsTree;
  comments: Comment[];
  newComments: Comment[];
  loading: boolean;
  hasMore: boolean;
  sortBy: CommentsSortByOptions | null;
  setSortBy: (newSortBy: CommentsSortByOptions) => void;
  loadMore: () => void;
  addCommentsToTree: (
    newComments: Comment[] | undefined,
    newlyAdded?: boolean
  ) => void;
  removeCommentFromTree: (commentId: string) => void;
}

function useEntityComments(
  props: UseEntityCommentsDataProps
): UseEntityCommentsDataValues {
  const { entityId, limit = 10, defaultSortBy = "new" } = props;

  const fetchManyComments = useFetchManyComments();

  const loading = useRef(true);
  const [loadingState, setLoadingState] = useState(true); // required to trigger rerenders

  const hasMore = useRef(true);
  const [hasMoreState, setHasMoreState] = useState(true); // required to trigger rerenders

  const [sortBy, setSortBy] = useState<CommentsSortByOptions>(defaultSortBy);
  const [page, setPage] = useState(1);

  const [entityCommentsTree, setEntityCommentsTree] =
    useState<EntityCommentsTree>({});

  const { comments, newComments } = useMemo(() => {
    const allRootComments = Object.values(entityCommentsTree).filter(
      (item) => !item.comment.parentId
    );

    const comments = allRootComments
      .filter((entry) => !entry.new)
      .map((entry) => entry.comment);

    const newComments = allRootComments
      .filter((entry) => !!entry.new)
      .map((entry) => entry.comment)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return { comments, newComments };
  }, [entityCommentsTree]);

  const addCommentsToTree = (
    newComments: Comment[] | undefined,
    newlyAdded?: boolean
  ) => {
    addCommentsToTreeHandler(setEntityCommentsTree, newComments, newlyAdded);
  };

  const removeCommentFromTree = useCallback(
    (commentId: string) => {
      setEntityCommentsTree!((prevTree) =>
        removeCommentFromTreeHandler(prevTree, commentId)
      );
    },
    [setEntityCommentsTree]
  );

  const resetComments = useCallback(async () => {
    if (!entityId) {
      console.warn(
        "The 'fetch comments' operation was invoked without a valid entity ID and has been aborted."
      );
      return;
    }
    try {
      loading.current = true;
      setLoadingState(true);

      hasMore.current = true;
      setHasMoreState(true);

      setEntityCommentsTree({});
      setPage(1);

      const newComments = await fetchManyComments({
        entityId,
        page: 1,
        sortBy,
        limit,
      });

      if (newComments) {
        addCommentsToTree(newComments);
        if (newComments.length < limit) {
          hasMore.current = false;
          setHasMoreState(false);
        }
      }
    } catch (err) {
      handleError(err, "Failed to reset entity comments:");
    } finally {
      loading.current = false;
      setLoadingState(false);
    }
  }, [fetchManyComments, limit, sortBy, entityId]);

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
      if (!entityId) {
        console.warn(
          "The 'fetch comments' operation was invoked without a valid entity ID and has been aborted."
        );
        return;
      }

      try {
        loading.current = true;
        setLoadingState(true);

        const newComments = await fetchManyComments({
          entityId,
          page,
          sortBy,
          limit,
        });

        if (newComments) {
          addCommentsToTree(newComments);
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
    entityCommentsTree,
    comments,
    newComments,
    loading: loadingState, // we use the state to trigger renders
    hasMore: hasMoreState,
    sortBy,
    setSortBy,
    loadMore,
    addCommentsToTree,
    removeCommentFromTree,
  };
}

export default useEntityComments;
