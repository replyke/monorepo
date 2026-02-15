import { View, ActivityIndicator } from "react-native";
import { useCommentSection } from "@replyke/core";
import useUIState from "../../hooks/use-ui-state";

const CommentsFooterComponent = () => {
  const { hasMore, loading } = useCommentSection();
  const { theme } = useUIState();

  return (
    hasMore &&
    loading && (
      <View className="p-3 justify-center items-center">
        <ActivityIndicator color={theme === 'dark' ? '#F9FAFB' : undefined} />
      </View>
    )
  );
};

export default CommentsFooterComponent;
