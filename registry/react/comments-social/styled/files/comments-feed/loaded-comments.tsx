import { Comment as CommentType, useCommentSection } from "@sublay/react-js";
import { resetDiv } from "@sublay/ui-core-react-js";
import useUIState from "../../hooks/use-ui-state";

import Comment from "./comment";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();
  const { theme } = useUIState();

  return (
    <div
      style={{
        ...resetDiv,
        display: "grid",
        // 🎨 CUSTOMIZATION: Feed background and gap (Default: white, 8px gap)
        gap: 8,
        backgroundColor: theme === 'dark' ? '#1F2937' : '#fff',
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
