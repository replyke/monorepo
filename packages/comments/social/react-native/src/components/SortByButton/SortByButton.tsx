import { ReactNode } from "react";
import { TouchableOpacity } from "react-native";
import { CommentsSortByOptions, useCommentSection } from "@replyke/core";
import { resetButton } from "@replyke/ui-core-react-native";

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
