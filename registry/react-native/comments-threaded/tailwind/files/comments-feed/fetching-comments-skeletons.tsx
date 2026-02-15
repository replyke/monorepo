import { View } from "react-native";
import { CommentSkeleton } from "@replyke/ui-core-react-native";

function FetchingCommentsSkeletons() {
  return (
    <View className="gap-2 pb-6 px-4">
      {[1, 2, 3].map((i) => (
        <CommentSkeleton key={i} />
      ))}
    </View>
  );
}

export default FetchingCommentsSkeletons;
