import { View } from "react-native";
import { FlatList } from "react-native";
import { Comment as CommentType, useCommentSection } from "@replyke/core";
import { useSocialStyleConfig } from "@replyke/comments-social-core";
import { Comment } from "./Comment";
import CommentsFooterComponent from "./CommentsFooterComponent";

const LoadedComments = ({ data }: { data: CommentType[] }) => {
  const { loadMore, highlightedComment } = useCommentSection();
  const { styleConfig } = useSocialStyleConfig();

  const { commentsGap } = styleConfig!.commentFeedProps;

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <Comment comment={item} />}
      ListHeaderComponent={
        highlightedComment ? (
          <Comment
            comment={
              highlightedComment.parentComment ?? highlightedComment.comment
            }
          />
        ) : null
      }
      ListHeaderComponentStyle={{ paddingBottom: commentsGap }}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ height: commentsGap }} />}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="always"
      onEndReached={() => data.length > 0 && loadMore!()}
      onEndReachedThreshold={0}
      ListFooterComponent={<CommentsFooterComponent />}
    />
  );
};

export default LoadedComments;
