import { useMemo, useState } from "react";
import { useReplies, useCommentSection } from "@replyke/react-js";
import { CommentSkeleton } from "@replyke/ui-core-react-js";

import Comment from "../comment";
import ShowHideButton from "./show-hide-button";

export function Replies({ commentId }: { commentId: string }) {
  const { sortBy, entityCommentsTree, highlightedComment } =
    useCommentSection();

  const { replies, newReplies, page, setPage, loading } = useReplies({
    commentId,
    sortBy: sortBy!,
  });

  const [areRepliesVisible, setAreRepliesVisible] = useState(false);

  // 🎨 CUSTOMIZATION: Reply spacing (Default: 12px gap, 8px top padding)
  const repliesGap = 12;
  const repliesPaddingTop = 8;

  const comment = entityCommentsTree![commentId]?.comment;

  const filteredReplies = useMemo(() => {
    return replies.filter((c) => c.id !== highlightedComment?.comment.id);
  }, [replies, highlightedComment]);

  const newRepliesList = newReplies.map((reply) => (
    <Comment comment={reply} extraLeftPadding={42} key={reply.id} />
  ));

  const oldRepliesList = filteredReplies.map((reply) => (
    <Comment comment={reply} extraLeftPadding={42} key={reply.id} />
  ));

  const someRepliesShow =
    newReplies.length > 0 ||
    highlightedComment?.parentComment?.id === commentId ||
    (areRepliesVisible && filteredReplies.length > 0) ||
    loading;

  if ((!comment || comment.repliesCount === 0) && newReplies.length === 0)
    return null;

  return (
    <div>
      {someRepliesShow && (
        <div
          style={{
            paddingTop: repliesPaddingTop,
            display: "flex",
            flexDirection: "column",
            gap: repliesGap,
          }}
        >
          {/* New replies should always show first*/}
          {newRepliesList}

          {/* Highlighted reply */}
          {highlightedComment &&
            highlightedComment.parentComment?.id === commentId && (
              <Comment
                comment={highlightedComment.comment}
                extraLeftPadding={42}
              />
            )}

          {/* Old replies should only show if it is set to show */}
          {areRepliesVisible && oldRepliesList}

          {/* If replies are fetched we show the skeleton */}
          {loading &&
            Array.from(
              {
                length: Math.min(
                  5,
                  comment.repliesCount - filteredReplies.length
                ),
              },
              (_, index) => index + 1
            ).map((i) => <CommentSkeleton extraLeftPadding={42} key={i} />)}
        </div>
      )}

      <ShowHideButton
        totalRepliesCount={
          comment.repliesCount -
          (highlightedComment?.parentComment?.id === commentId ? 1 : 0)
        }
        loadedRepliesCount={filteredReplies.length}
        page={page}
        setPage={setPage}
        areRepliesVisible={areRepliesVisible}
        setAreRepliesVisible={setAreRepliesVisible}
      />
    </div>
  );
}

export default Replies;
