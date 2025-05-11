import { ReactNode } from "react";
import { CommentsSortByOptions, useCommentSection } from "@replyke/react-js";
import { resetButton } from "@replyke/ui-core-react-js";

function SortByButton({
  priority,
  activeView,
  nonActiveView,
}: {
  priority: CommentsSortByOptions;
  activeView: ReactNode;
  nonActiveView: ReactNode;
}) {
  const { sortBy, setSortBy } = useCommentSection();
  return (
    <button style={{ ...resetButton }} onClick={() => setSortBy!(priority)}>
      {sortBy === priority ? activeView : nonActiveView}
    </button>
  );
}

export default SortByButton;
