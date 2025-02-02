import { FlatList, View } from "react-native";
import { useSocialStyleConfig } from "replyke-core";
import { CommentSkeleton } from "../../../shared/Skeleton";

const FetchingCommentsSkeletons = () => {
  const { styleConfig } = useSocialStyleConfig();
  const { commentsGap } = styleConfig!.commentFeedProps;

  return (
    <FlatList
      data={[1, 2, 3]}
      renderItem={() => <CommentSkeleton />}
      keyExtractor={(item) => item.toString()}
      ItemSeparatorComponent={() => <View style={{ height: commentsGap }} />}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: 24,
        paddingRight: 16,
        paddingLeft: 16,
      }}
      keyboardShouldPersistTaps="always"
    />
  );
};

export default FetchingCommentsSkeletons;
