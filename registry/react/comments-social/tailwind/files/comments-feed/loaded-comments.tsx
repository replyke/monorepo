import { Comment as CommentType, useCommentSection } from "@replyke/react-js";
import { resetDiv } from "@replyke/ui-core-react-js";
import useUIState from "../../hooks/use-ui-state";

import Comment from "./comment";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();

  return (
    <div
      style={resetDiv}
      className="grid gap-2 bg-white dark:bg-gray-800"
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
