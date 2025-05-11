import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { useReplies, useCommentSection } from "@replyke/core";
import { useSocialStyleConfig } from "@replyke/comments-social-core";
import { CommentSkeleton } from "@replyke/ui-core-react-native";
import Comment from "../Comment";
import ShowHideButton from "./ShowHideButton";

function Replies({ commentId }: { commentId: string }) {
  const { sortBy, entityCommentsTree, highlightedComment } =
    useCommentSection();
  const { styleConfig } = useSocialStyleConfig();

  const { replies, newReplies, page, setPage, loading } = useReplies({
    commentId,
    sortBy: sortBy!,
  });

  const [areRepliesVisible, setAreRepliesVisible] = useState(false);

  const { repliesGap, repliesPaddingTop } = styleConfig!.commentProps;

  const comment = entityCommentsTree![commentId]?.comment;

  const filteredReplies = useMemo(() => {
    return replies.filter((c) => c.id !== highlightedComment?.comment.id);
  }, [replies, highlightedComment]);

  const newRepliesList = (
    <FlatList
      data={newReplies}
      renderItem={({ item }) => (
        <Comment comment={item} extraLeftPadding={42} />
      )}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ height: repliesGap }} />}
      keyboardShouldPersistTaps="always"
    />
  );

  const oldRepliesList = (
    <FlatList
      data={filteredReplies}
      renderItem={({ item }) => (
        <Comment comment={item} extraLeftPadding={42} />
      )}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ height: repliesGap }} />}
      keyboardShouldPersistTaps="always"
    />
  );

  const someRepliesShow =
    newReplies.length > 0 ||
    highlightedComment?.parentComment?.id === commentId ||
    (areRepliesVisible && filteredReplies.length > 0) ||
    loading;

  if ((!comment || comment.repliesCount === 0) && newReplies.length === 0)
    return null;

  return (
    <View>
      {someRepliesShow && (
        <View
          style={{
            paddingTop: repliesPaddingTop,
            flexDirection: "column",
            gap: repliesGap,
          }}
        >
          {/* New replies should always show */}
          {newRepliesList}

          {/* Highlighted reply */}
          {highlightedComment &&
            highlightedComment.parentComment?.id === commentId && (
              <Comment
                comment={highlightedComment.comment}
                extraLeftPadding={42}
              />
            )}

          {/* Old replies should only show if it is set to show */}
          {areRepliesVisible && oldRepliesList}
        </View>
      )}

      {/* If replies are fetched we show the skeleton */}
      {loading && (
        <FlatList
          data={Array.from(
            {
              length: Math.min(
                5,
                comment.repliesCount - filteredReplies.length
              ),
            },
            (_, index) => index + 1
          )}
          renderItem={() => <CommentSkeleton />}
          keyExtractor={(item) => String(item)}
          ItemSeparatorComponent={() => <View style={{ height: repliesGap }} />}
          style={{ paddingLeft: 42, paddingRight: 16 }}
          keyboardShouldPersistTaps="always"
        />
      )}

      <ShowHideButton
        totalRepliesCount={
          comment.repliesCount -
          (highlightedComment?.parentComment?.id === commentId ? 1 : 0)
        }
        loadedRepliesCount={filteredReplies.length}
        page={page}
        setPage={setPage}
        areRepliesVisible={areRepliesVisible}
        setAreRepliesVisible={setAreRepliesVisible}
      />
    </View>
  );
}

export default Replies;
