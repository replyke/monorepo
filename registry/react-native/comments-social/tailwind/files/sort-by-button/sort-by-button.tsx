import { ReactNode } from "react";
import { TouchableOpacity } from "react-native";
import { CommentsSortByOptions, useCommentSection } from "@sublay/react-native";

function SortByButton({
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

  const handlePress = () => {
    setSortBy!(priority);
    if (sortDir) setSortDir!(sortDir);
  };

  return (
    <TouchableOpacity
      className="bg-transparent border-0 p-0 m-0"
      onPress={handlePress}
    >
      {isActive ? activeView : nonActiveView}
    </TouchableOpacity>
  );
}

export default SortByButton;
