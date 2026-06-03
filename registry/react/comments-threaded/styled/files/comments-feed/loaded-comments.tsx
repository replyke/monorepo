import { Comment as CommentType, useCommentSection } from "@sublay/react-js";
import { resetDiv } from "@sublay/ui-core-react-js";

import CommentThread from "./comment-thread";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();

  return (
    <div
      style={{
        ...resetDiv,
        display: "grid",
        gap: "8px",
      }}
    >
      {highlightedComment ? (
        <CommentThread
          comment={
            highlightedComment.parentComment ?? highlightedComment.comment
          }
          depth={0}
        />
      ) : null}
      {data?.map((c) => (
        <CommentThread comment={c} depth={0} key={c.id} />
      ))}
    </div>
  );
}

export default LoadedComments;
