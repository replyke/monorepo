import { ReactNode } from "react";
import { CommentsSortByOptions, useCommentSection } from "@sublay/react-js";
import { resetButton } from "@sublay/ui-core-react-js";

export function SortByButton({
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
