import { ReactNode } from "react";
import { TouchableOpacity } from "react-native";
import { CommentsSortByOptions, useCommentSection } from "@replyke/core";

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
      className="bg-transparent border-0 p-0 m-0"
      onPress={() => setSortBy!(priority)}
    >
      {sortBy === priority ? activeView : nonActiveView}
    </TouchableOpacity>
  );
}

export default SortByButton;
