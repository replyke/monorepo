import React, { useState } from "react";
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
import {
  UserAvatar,
  FromNow,
  parseContentWithMentions,
  getImageComponent,
} from "@replyke/ui-core-react-native";
import { Replies } from "./replies";
import HeartButton from "./heart-button";
import useUIState from "../../../hooks/use-ui-state";

const Comment = React.memo(
  ({
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
    const { theme, openCommentOptionsSheet, openCommentOptionsSheetOwner } = useUIState();

    // 🎨 CUSTOMIZATION: Comment styling defaults
    const horizontalItemsGap = 8;
    const verticalItemsGap = 4;
    const authorAvatarSize = 32;
    const authorFontSize = 13;
    const authorFontWeight = '700' as const;
    const authorFontColor = theme === 'dark' ? '#F9FAFB' : '#000';
    const fromNowFontSize = 12;
    const fromNowFontColor = theme === 'dark' ? '#9CA3AF' : '#737373';
    const commentBodyFontSize = 13;
    const commentBodyFontColor = theme === 'dark' ? '#F9FAFB' : '#000';
    const actionsItemGap = 12;
    const replyButtonFontSize = 12;
    const replyButtonFontWeight = '600' as const;
    const replyButtonFontColor = theme === 'dark' ? '#9CA3AF' : '#737373';
    const heartIconSize = 14;
    const heartIconEmptyColor = theme === 'dark' ? '#9CA3AF' : '#8E8E8E';
    const heartIconFullColor = theme === 'dark' ? '#F87171' : '#DC2626';
    const heartIconPaddingBottom = 2;
    const likesCountFontSize = 11;
    const likesCountFontWeight = '600' as const;
    const likesCountFontColor = theme === 'dark' ? '#9CA3AF' : '#8E8E8E';

    const [comment, setComment] = useState(commentFromSection);
    const { upvoteComment, removeCommentUpvote } = useCommentVotes({
      comment,
      setComment,
    });

    const handleUpvoteComment = () => {
      if (!user) {

          callbacks?.loginRequiredCallback?.();
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

          callbacks?.loginRequiredCallback?.();
        return;
      }

      try {
        removeCommentUpvote();
      } catch (err) {
        handleError(err, "Failed to upvote comment");
      }
    };

    const userUpvotedComment = !!(user && comment.upvotes.includes(user.id));
    const isOwner = comment.userId === user?.id;

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
      overflow: "hidden" as const,
    };

    const imageProps = isExpo
      ? {
          source: comment.gif?.gifUrl, // expo-image accepts a string
          contentFit: "cover" as const,
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
          // 🎨 CUSTOMIZATION: Highlighted comment background
          backgroundColor:
            highlightedComment?.comment.id === comment.id
              ? (theme === 'dark' ? "#1E40AF" : "#dbeafe")
              : "transparent",
        }}
      >
        <Pressable
          onLongPress={() => {
            Vibration.vibrate(50);
            // Open appropriate sheet based on ownership
            if (isOwner) {
              openCommentOptionsSheetOwner!(comment);
            } else {
              openCommentOptionsSheet!(comment);
            }
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
                  callbacks?.otherUserClickCallback?.(
                    comment.user.id,
                    comment.user.foreignId
                  );
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
                      callbacks?.otherUserClickCallback?.(
                        comment.user.id,
                        comment.user.foreignId
                      );
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
  }
);

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

Comment.displayName = "Comment";

export default Comment;
