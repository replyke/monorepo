import { ReactNode } from "react";
import { CommentsSortByOptions, useCommentSection } from "replyke-core";
import { TouchableOpacity } from "react-native";
import { resetButton } from "../../../../constants/reset-styles";

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
    <TouchableOpacity
      style={{ ...resetButton }}
      onPress={() => setSortBy!(priority)}
    >
      {sortBy === priority ? activeView : nonActiveView}
    </TouchableOpacity>
  );
}

export default SortByButton;
