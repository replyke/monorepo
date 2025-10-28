import { resetDiv, CommentSkeleton } from "@replyke/ui-core-react-js";

function FetchingCommentsSkeletons() {

  return (
    <div
      style={{
        ...resetDiv,
        display: "grid",
        gap: "8px",
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
