import { View, ActivityIndicator } from "react-native";
import { useCommentSection } from "@replyke/core";
import useUIState from "../../hooks/use-ui-state";

const CommentsFooterComponent = () => {
  const { hasMore, loading } = useCommentSection();
  const { theme } = useUIState();

  return (
    hasMore &&
    loading && (
      <View
        style={{
          padding: 12,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={theme === 'dark' ? '#F9FAFB' : undefined} />
      </View>
    )
  );
};

export default CommentsFooterComponent;
