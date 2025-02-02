import { useSocialStyleConfig } from "@replyke/comments-social-core";
import { resetDiv, CommentSkeleton } from "@replyke/ui-core-react-js";

function FetchingCommentsSkeletons() {
  const { styleConfig } = useSocialStyleConfig();
  const { backgroundColor, commentsGap } = styleConfig!.commentFeedProps;

  return (
    <div
      style={{
        ...resetDiv,
        display: "flex",
        flexDirection: "column",
        gap: commentsGap,
        backgroundColor,
        paddingBottom: 24,
        paddingRight: 16,
        paddingLeft: 16,
      }}
    >
      {[1, 2, 3].map((i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}

export default FetchingCommentsSkeletons;
