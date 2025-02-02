import { View, ActivityIndicator } from "react-native";
import { useCommentSection } from "@replyke/core";

const CommentsFooterComponent = () => {
  const { hasMore, loading } = useCommentSection();

  return (
    hasMore &&
    loading && (
      <View
        style={{
          padding: 12,
          justifyContent: "center", // Center vertically
          alignItems: "center", // Center horizontally
        }}
      >
        <ActivityIndicator />
      </View>
    )
  );
};

export default CommentsFooterComponent;
