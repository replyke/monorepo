import { resetDiv, CommentSkeleton } from "@replyke/ui-core-react-js";
import useUIState from "../../hooks/use-ui-state";

function FetchingCommentsSkeletons() {
  return (
    <div
      style={resetDiv}
      className="flex flex-col gap-2 bg-white dark:bg-gray-800 pb-6 pr-4 pl-4"
    >
      {[1, 2, 3].map((i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}

export default FetchingCommentsSkeletons;
