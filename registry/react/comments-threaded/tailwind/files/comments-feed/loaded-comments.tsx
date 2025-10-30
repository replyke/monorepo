import { Comment as CommentType, useCommentSection } from "@replyke/react-js";
import CommentThread from "./comment-thread";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();

  return (
    <div className="grid gap-2">
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
