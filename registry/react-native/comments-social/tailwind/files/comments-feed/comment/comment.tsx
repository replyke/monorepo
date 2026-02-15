import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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

    // CUSTOMIZATION: Comment styling defaults
    const authorAvatarSize = 32;
    const heartIconSize = 14;
    const heartIconEmptyColor = theme === 'dark' ? '#9CA3AF' : '#8E8E8E';
    const heartIconFullColor = theme === 'dark' ? '#F87171' : '#DC2626';

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
          source: comment.gif?.gifUrl,
          contentFit: "cover" as const,
          transition: 1000,
          placeholder: comment.gif?.gifPreviewUrl,
        }
      : {
          source: { uri: comment.gif?.gifUrl },
        };

    const isHighlighted = highlightedComment?.comment.id === comment.id;

    return (
      <View
        className={`py-2 ${
          isHighlighted
            ? theme === 'dark'
              ? 'bg-blue-800'
              : 'bg-blue-100'
            : 'bg-transparent'
        }`}
      >
        <Pressable
          onLongPress={() => {
            Vibration.vibrate(50);
            if (isOwner) {
              openCommentOptionsSheetOwner!(comment);
            } else {
              openCommentOptionsSheet!(comment);
            }
            Keyboard.dismiss();
          }}
          className="w-full pr-4"
          style={{ paddingLeft: 16 + extraLeftPadding }}
        >
          <View className="flex-row items-start gap-2">
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
            <View className="flex-1 flex-col gap-1">
              <View className="flex-row items-baseline gap-1 mt-0.5">
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
                    className={`text-[13px] font-bold ${
                      theme === 'dark' ? 'text-gray-50' : 'text-black'
                    }`}
                  >
                    {getUserName(comment.user, "username")}
                  </Text>
                </Pressable>
                <FromNow
                  time={comment.createdAt}
                  fontSize={12}
                  color={theme === 'dark' ? '#9CA3AF' : '#737373'}
                />
              </View>

              {comment.content && (
                <Text
                  className={`text-[13px] ${
                    theme === 'dark' ? 'text-gray-50' : 'text-black'
                  }`}
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

              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() =>
                    comment.parentId
                      ? handleShallowReply!(comment)
                      : handleDeepReply!(comment)
                  }
                >
                  <Text
                    className={`text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-400' : 'text-neutral-500'
                    }`}
                  >
                    Reply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-col items-center">
              <HeartButton
                userUpvoted={userUpvotedComment}
                handleUpvote={handleUpvoteComment}
                handleRemoveUpvote={handleRemoveCommentUpvote}
                iconSize={heartIconSize}
                emptyColor={heartIconEmptyColor}
                fullColor={heartIconFullColor}
                padding={4}
                paddingBottom={2}
              />
              <Text
                className={`text-[11px] font-semibold ${
                  theme === 'dark' ? 'text-gray-400' : 'text-neutral-500'
                }`}
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

Comment.displayName = "Comment";

export default Comment;
