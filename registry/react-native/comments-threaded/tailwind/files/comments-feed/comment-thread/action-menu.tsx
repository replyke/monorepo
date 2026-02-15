import { TouchableOpacity, Text, View } from "react-native";
import { useUser, Comment as CommentType } from "@replyke/core";
import useUIState from "../../../hooks/use-ui-state";

interface ActionMenuProps {
  comment: CommentType;
}

function ActionMenu({ comment }: ActionMenuProps) {
  const { user } = useUser();
  const { theme, openCommentOptionsSheet, openCommentOptionsSheetOwner } = useUIState();

  return (
    <View className="relative">
      <TouchableOpacity
        onPress={() =>
          user && user.id === comment.userId
            ? openCommentOptionsSheetOwner?.(comment)
            : openCommentOptionsSheet?.(comment)
        }
        className={`p-1 rounded ${
          theme === 'dark' ? 'active:bg-gray-700' : 'active:bg-gray-50'
        }`}
      >
        <Text
          className={`text-xs ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          •••
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default ActionMenu;
