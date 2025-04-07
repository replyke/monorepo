import { Comment as CommentType, useCommentSection } from "@replyke/react-js";
import { useSocialStyleConfig } from "@replyke/comments-social-core";
import { resetDiv } from "@replyke/ui-core-react-js";

import { Comment } from "./Comment";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();
  const { styleConfig } = useSocialStyleConfig();

  const { backgroundColor, commentsGap } = styleConfig!.commentFeedProps;

  return (
    <div
      style={{
        ...resetDiv,
        display: "grid",
        gap: commentsGap,
        backgroundColor,
      }}
    >
      {highlightedComment ? (
        <Comment
          comment={
            highlightedComment.parentComment ?? highlightedComment.comment
          }
        />
      ) : null}
      {data?.map((c) => (
        <Comment comment={c} key={c.id} />
      ))}
    </div>
  );
}

export default LoadedComments;
