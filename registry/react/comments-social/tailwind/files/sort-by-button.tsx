import { ReactNode } from "react";
import { CommentsSortByOptions, useCommentSection } from "@sublay/react-js";
import { resetButton } from "@sublay/ui-core-react-js";

export function SortByButton({
  priority,
  sortDir,
  activeView,
  nonActiveView,
}: {
  priority: CommentsSortByOptions;
  // Direction for the `createdAt` sort (the New/Old toggle). Ignored by
  // non-directional sorts like `top`/`controversial`.
  sortDir?: "asc" | "desc";
  activeView: ReactNode;
  nonActiveView: ReactNode;
}) {
  const {
    sortBy,
    setSortBy,
    sortDir: currentSortDir,
    setSortDir,
  } = useCommentSection();

  // For the directional `createdAt` sort, a button is active only when both the
  // sort and the direction match; other sorts ignore direction.
  const isActive =
    sortBy === priority &&
    (priority !== "createdAt" || !sortDir || currentSortDir === sortDir);

  const handleClick = () => {
    setSortBy!(priority);
    if (sortDir) setSortDir!(sortDir);
  };

  return (
    <button style={{ ...resetButton }} onClick={handleClick}>
      {isActive ? activeView : nonActiveView}
    </button>
  );
}

export default SortByButton;
