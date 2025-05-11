import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Pressable,
  Keyboard,
} from "react-native";
import {
  Comment as CommentType,
  useCommentVotes,
  useCommentSection,
  useUser,
  getUserName,
  handleError,
} from "@replyke/core";
import { useSocialStyleConfig } from "@replyke/comments-social-core";
import {
  UserAvatar,
  FromNow,
  parseContentWithMentions,
  getImageComponent,
} from "@replyke/ui-core-react-native";
import { Replies } from "./Replies";
import HeartButton from "./HeartButton";
import useSheetManager from "../../../hooks/useSheetManager";

const Comment = ({
  comment: commentFromSection,
  extraLeftPadding = 0,
}: {
  comment: CommentType;
  extraLeftPadding?: number;
}) => {
  // Dynamically get the correct Image component and whether it is expo-image.
  const { ImageComponent, isExpo } = getImageComponent();

  const { user } = useUser();
  const { handleShallowReply, handleDeepReply, callbacks, highlightedComment } =
    useCommentSection();
  const { styleConfig } = useSocialStyleConfig();
  const { openCommentOptionsSheet } = useSheetManager();
  const {
    horizontalItemsGap,
    verticalItemsGap,
    authorAvatarSize,
    authorFontSize,
    authorFontWeight,
    authorFontColor,
    fromNowFontSize,
    fromNowFontColor,
    commentBodyFontSize,
    commentBodyFontColor,
    actionsItemGap,
    replyButtonFontSize,
    replyButtonFontWeight,
    replyButtonFontColor,
    heartIconSize,
    heartIconEmptyColor,
    heartIconFullColor,
    heartIconPaddingBottom,
    likesCountFontSize,
    likesCountFontWeight,
    likesCountFontColor,
  } = styleConfig!.commentProps;

  const [comment, setComment] = useState(commentFromSection);
  const { upvoteComment, removeCommentUpvote } = useCommentVotes({
    comment,
    setComment,
  });

  const handleUpvoteComment = () => {
    if (!user) {
      callbacks?.loginRequiredCallback ||
        (() => alert("Please login first."))();
      return;
    }

    if (!user.username && callbacks?.usernameRequiredCallback) {
      callbacks.usernameRequiredCallback();
      return;
    }

    try {
      upvoteComment();
    } catch (err) {
      handleError(err, "Failed to upvote comment");
    }
  };

  const handleRemoveCommentUpvote = () => {
    if (!user) {
      callbacks?.loginRequiredCallback ||
        (() => alert("Please login first."))();
      return;
    }

    try {
      removeCommentUpvote();
    } catch (err) {
      handleError(err, "Failed to upvote comment");
    }
  };

  const userUpvotedComment = !!(user && comment.upvotes.includes(user.id));

  const imageStyle = {
    width:
      (comment.gif?.aspectRatio || 1) < 1
        ? 200
        : 200 * (comment.gif?.aspectRatio || 1),
    height:
      (comment.gif?.aspectRatio || 1) > 1
        ? 200
        : 200 * (comment.gif?.aspectRatio || 1),
    borderRadius: 4,
    overflow: "hidden",
  };

  const imageProps = isExpo
    ? {
        source: comment.gif?.gifUrl, // expo-image accepts a string
        contentFit: "cover",
        transition: 1000,
        placeholder: comment.gif?.gifPreviewUrl,
      }
    : {
        source: { uri: comment.gif?.gifUrl }, // React Native's Image requires { uri: ... }
      };

  return (
    <View
      style={{
        paddingVertical: 8,
        backgroundColor:
          highlightedComment?.comment.id === comment.id
            ? "#dbeafe"
            : "transparent",
      }}
    >
      <Pressable
        onLongPress={() => {
          Vibration.vibrate(50);
          openCommentOptionsSheet!(comment);
          Keyboard.dismiss();
        }}
        style={{
          ...styles.container,
          paddingRight: 16,
          paddingLeft: 16 + extraLeftPadding,
        }}
      >
        <View style={[styles.commentHeader, { gap: horizontalItemsGap }]}>
          <Pressable
            onPress={() => {
              if (comment.user.id === user?.id) {
                callbacks?.currentUserClickCallback?.();
              } else {
                callbacks?.otherUserClickCallback?.(comment.user.id);
              }
            }}
          >
            <UserAvatar
              user={comment.user}
              borderRadius={authorAvatarSize}
              size={authorAvatarSize}
            />
          </Pressable>
          <View style={[styles.commentBody, { gap: verticalItemsGap }]}>
            <View style={styles.commentMeta}>
              <Pressable
                onPress={() => {
                  if (comment.user.id === user?.id) {
                    callbacks?.currentUserClickCallback?.();
                  } else {
                    callbacks?.otherUserClickCallback?.(comment.user.id);
                  }
                }}
              >
                <Text
                  style={[
                    styles.authorText,
                    {
                      fontWeight: authorFontWeight,
                      fontSize: authorFontSize,
                      color: authorFontColor,
                    },
                  ]}
                >
                  {getUserName(comment.user, "username")}
                </Text>
              </Pressable>
              <FromNow
                time={comment.createdAt}
                fontSize={fromNowFontSize}
                color={fromNowFontColor}
              />
            </View>

            {comment.content && (
              <Text
                style={[
                  styles.commentText,
                  {
                    fontSize: commentBodyFontSize,
                    color: commentBodyFontColor,
                  },
                ]}
              >
                {parseContentWithMentions(
                  comment.content,
                  comment.mentions,
                  user?.id,
                  callbacks?.currentUserClickCallback,
                  callbacks?.otherUserClickCallback
                )}
              </Text>
            )}
            {comment.gif?.gifUrl && (
              <ImageComponent style={imageStyle} {...imageProps} />
            )}

            <View style={[styles.actionsContainer, { gap: actionsItemGap }]}>
              <TouchableOpacity
                onPress={() =>
                  comment.parentId
                    ? handleShallowReply!(comment)
                    : handleDeepReply!(comment)
                }
                style={styles.replyButton}
              >
                <Text
                  style={{
                    color: replyButtonFontColor,
                    fontSize: replyButtonFontSize,
                    fontWeight: replyButtonFontWeight,
                  }}
                >
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.likesContainer}>
            <HeartButton
              userUpvoted={userUpvotedComment}
              handleUpvote={handleUpvoteComment}
              handleRemoveUpvote={handleRemoveCommentUpvote}
              iconSize={heartIconSize}
              emptyColor={heartIconEmptyColor}
              fullColor={heartIconFullColor}
              padding={4}
              paddingBottom={heartIconPaddingBottom}
            />
            <Text
              style={{
                fontSize: likesCountFontSize,
                color: likesCountFontColor,
                fontWeight: likesCountFontWeight,
              }}
            >
              {comment.upvotes.length}
            </Text>
          </View>
        </View>
      </Pressable>
      {!comment.parentId && <Replies commentId={comment.id} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  commentHeader: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  commentBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  commentMeta: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 2,
  },
  authorText: {
    // Custom styles if needed
  },
  commentText: {
    // Custom styles if needed
  },
  actionsContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  replyButton: {
    // Custom styles if needed
  },
  menuButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  likesContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
});

export default Comment;
