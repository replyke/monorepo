import { useEffect, useState } from "react";
import { Comment  } from "../../interfaces/models/Comment";
import { handleError } from "../../utils/handleError";
import useCommentSection from "./useCommentSection";
import useGroupReplies from "./useGroupReplies";
import useFetchManyComments from "./useFetchManyComments";
import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";

function useReplies({
  commentId,
  sortBy,
}: {
  commentId: string;
  sortBy: CommentsSortByOptions;
}) {
  const fetchManyComments = useFetchManyComments();
  const { addCommentsToTree } = useCommentSection();

  const [page, setPage] = useState(0);
  const [loadingState, setLoadingState] = useState(false);

  const { replies, newReplies } = useGroupReplies({
    commentId,
  });

  useEffect(() => {
    const loadReplies = async () => {
      if (!commentId) {
        console.warn(
          "The 'fetch comments' operation was invoked without a valid comment ID and has been aborted."
        );
        return;
      }

      try {
        setLoadingState(true);

        const fetchedReplies: Comment[] = await fetchManyComments({
          parentId: commentId,
          page,
          sortBy,
          limit: 5,
        });

        addCommentsToTree?.(fetchedReplies);
      } catch (err: unknown) {
        handleError(err, "Failed to fetch replies: ");
      } finally {
        setLoadingState(false);
      }
    };

    if (page > 0) {
      loadReplies();
    }
  }, [page]);

  return {
    replies,
    newReplies,
    loading: loadingState,
    page,
    setPage,
  };
}

export default useReplies;
