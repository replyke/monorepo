import { Comment as CommentType, useCommentSection } from "@replyke/react-js";
import { resetDiv } from "@replyke/ui-core-react-js";
import useUIState from "../../hooks/use-ui-state";

import { Comment } from "./comment/comment";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();
  const { theme } = useUIState();

  // 🎨 CUSTOMIZATION: Feed background and gap (Default: white, 8px gap)
  const backgroundColor = theme === 'dark' ? '#1F2937' : '#fff';
  const commentsGap = 8;

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
