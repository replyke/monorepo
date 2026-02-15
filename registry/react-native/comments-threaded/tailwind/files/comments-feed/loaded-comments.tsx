import { View } from "react-native";
import { Comment as CommentType, useCommentSection } from "@replyke/core";
import CommentThread from "./comment-thread";

function LoadedComments({ data }: { data: CommentType[] }) {
  const { highlightedComment } = useCommentSection();

  return (
    <View className="gap-2">
      {highlightedComment ? (
        <CommentThread
          comment={
            highlightedComment.parentComment ?? highlightedComment.comment
          }
          depth={0}
        />
      ) : null}
      {data?.map((c) => (
        <CommentThread comment={c} depth={0} key={c.id} />
      ))}
    </View>
  );
}

export default LoadedComments;
