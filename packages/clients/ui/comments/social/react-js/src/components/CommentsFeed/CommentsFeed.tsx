import React, { ReactNode, useMemo } from "react";
import { useCommentSection } from "@replyke/react-js";
import LoadedComments from "./LoadedComments";
import FetchingCommentsSkeletons from "./FetchingCommentsSkeletons";
import NoCommentsPlaceHolder from "./NoCommentsPlaceHolder";

const CommentsFeed = React.memo(
  ({ children: customNoCommentsView }: { children?: ReactNode }) => {
    const { comments, newComments, loading, highlightedComment } =
      useCommentSection();

    const mergedComments = useMemo(() => {
      let combinedComments = [...(newComments ?? []), ...(comments ?? [])];

      if (highlightedComment) {
        const { comment, parentComment } = highlightedComment;
        combinedComments = combinedComments.filter(
          (item) => item.id !== comment.id && item.id !== parentComment?.id
        );
      }

      return combinedComments;
    }, [comments, newComments, highlightedComment]);

    const showLoadedComments = mergedComments.length > 0 || highlightedComment;
    const showFetchingSkeletons =
      loading && mergedComments.length === 0 && !highlightedComment;

    // If fetching is done and no comments;
    // Also, because we filter the highlghted comment when it is showing, then we need to make sure this isn't the case here, and show no comments when actually there is one comment - the highlighted one
    const showNoComments =
      !loading && mergedComments.length === 0 && !highlightedComment;

    return (
      <div style={{ flex: 1 }}>
        {showLoadedComments && <LoadedComments data={mergedComments} />}
        {showFetchingSkeletons && <FetchingCommentsSkeletons />}
        {showNoComments && (customNoCommentsView ?? <NoCommentsPlaceHolder />)}
      </div>
    );
  }
);

export default CommentsFeed;
