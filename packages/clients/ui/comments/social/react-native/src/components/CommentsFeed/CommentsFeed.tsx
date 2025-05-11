import { ReactNode, useMemo } from "react";
import { View } from "react-native";
import { useCommentSection } from "@replyke/core";
import NoCommentsPlaceHolder from "./NoCommentsPlaceHolder";
import FetchingCommentsSkeletons from "./FetchingCommentsSkeletons";
import LoadedComments from "./LoadedComments";

const CommentsFeed = ({
  children: customNoCommentsView,
}: {
  children?: ReactNode;
}) => {
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
    <View style={{ flex: 1 }}>
      {showLoadedComments && <LoadedComments data={mergedComments} />}
      {showFetchingSkeletons && <FetchingCommentsSkeletons />}
      {showNoComments && (customNoCommentsView ?? <NoCommentsPlaceHolder />)}
    </View>
  );
};

export default CommentsFeed;
