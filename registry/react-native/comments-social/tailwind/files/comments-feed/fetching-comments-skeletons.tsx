import { FlatList, View } from "react-native";
import { CommentSkeleton } from "@replyke/ui-core-react-native";

const FetchingCommentsSkeletons = () => {
  return (
    <FlatList
      data={[1, 2, 3]}
      renderItem={() => <CommentSkeleton />}
      keyExtractor={(item) => item.toString()}
      ItemSeparatorComponent={() => <View className="h-2" />}
      className="flex-1"
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
