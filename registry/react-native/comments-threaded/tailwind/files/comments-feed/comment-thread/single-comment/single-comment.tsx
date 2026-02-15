import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import {
  Comment as CommentType,
  getUserName,
  useCommentSection,
  useUser,
} from "@replyke/core";
import {
  parseContentWithMentions,
  UserAvatar,
  getImageComponent,
} from "@replyke/ui-core-react-native";
import VoteButtons from "./vote-buttons";
import ActionMenu from "../action-menu";
import NewReplyForm from "../new-reply-form";
import ToggleRepliesVisibility from "./toggle-replies-visibility";
import IndentationThreadingLines from "./indentation-threading-lines";
import ReplyButtonAndInfo from "./reply-button-and-info";
import useUIState from "../../../../hooks/use-ui-state";

interface SingleCommentProps {
  comment: CommentType;
  depth: number;
  hasReplies: boolean;
  isCollapsed: boolean;
  replyCount: number;
  isLastReply?: boolean;
  onToggleCollapse: () => void;
}

function SingleComment({
  comment: commentFromSection,
  depth,
  hasReplies,
  isCollapsed,
  replyCount,
  isLastReply = false,
  onToggleCollapse,
}: SingleCommentProps) {
  const { user } = useUser();
  const { callbacks, highlightedComment } = useCommentSection();
  const { theme } = useUIState();
  const [comment, setComment] = useState(commentFromSection);
  const [showReplyForm, setShowReplyForm] = useState(false);

  // Dynamically get the correct Image component
  const { ImageComponent, isExpo } = getImageComponent();

  const maxDepth = 6; // Limit visual nesting depth
  const actualDepth = Math.min(depth, maxDepth);

  // Calculate progressive indentation
  const indentationPx = actualDepth * 24; // 24px per level

  const isHighlighted = highlightedComment?.comment.id === comment.id;

  const imageStyle = {
    width:
      (comment.gif?.aspectRatio || 1) > 1
        ? 200
        : 200 * (comment.gif?.aspectRatio || 1),
    height:
      (comment.gif?.aspectRatio || 1) < 1
        ? 200
        : 200 / (comment.gif?.aspectRatio || 1),
    borderRadius: 4,
    overflow: "hidden" as const,
    marginBottom: 12,
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

  return (
    <View
      className={`relative ${
        isHighlighted
          ? theme === 'dark'
            ? 'bg-blue-900'
            : 'bg-blue-100'
          : ''
      }`}
      style={{
        marginLeft: indentationPx,
      }}
    >
      {/* Threading lines - positioned behind avatars */}
      {actualDepth > 0 && (
        <IndentationThreadingLines isLastReply={isLastReply} />
      )}

      <View className="py-2 rounded-md">
        <View className="flex-row">
          {/* Avatar with threading line connection */}
          <View className="mr-3 relative mt-1">
            <Pressable
              className="relative z-10"
              onPress={() => {
                if (user?.id === comment.user.id) {
                  callbacks?.currentUserClickCallback?.();
                } else {
                  callbacks?.otherUserClickCallback?.(comment.user.id, comment.user.foreignId);
                }
              }}
            >
              <UserAvatar
                user={comment.user}
                borderRadius={24}
                size={24}
              />
            </Pressable>
            {/* Vertical line extending down from this comment's avatar when it has replies */}
            {hasReplies && !isCollapsed && (
              <View
                className={`absolute w-px z-0 ${
                  theme === 'dark' ? 'bg-gray-500' : 'bg-gray-300'
                }`}
                style={{
                  left: '50%',
                  top: 20,
                  height: '100%',
                  marginLeft: -0.5,
                }}
              />
            )}
          </View>

          {/* Comment content area */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => {
                    if (user?.id === comment.user.id) {
                      callbacks?.currentUserClickCallback?.();
                    } else {
                      callbacks?.otherUserClickCallback?.(comment.user.id, comment.user.foreignId);
                    }
                  }}
                >
                  <Text
                    className={`font-medium text-xs ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {getUserName(comment.user)}
                  </Text>
                </Pressable>
                <Text
                  className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  •
                </Text>
                <Text
                  className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
                {isCollapsed && hasReplies && (
                  <Text
                    className={`text-xs ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                    }`}
                  >
                    ({replyCount} {replyCount === 1 ? "reply" : "replies"})
                  </Text>
                )}
                {hasReplies && (
                  <ToggleRepliesVisibility
                    isCollapsed={isCollapsed}
                    onToggleCollapse={onToggleCollapse}
                  />
                )}
              </View>
              <ActionMenu comment={comment} />
            </View>

            {!isCollapsed && (
              <>
                {comment.content && (
                  <Text
                    className={`text-xs mb-3 leading-relaxed ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
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

                {comment.gif && (
                  <ImageComponent style={imageStyle} {...imageProps} />
                )}

                <View className="flex-row items-center justify-between">
                  <ReplyButtonAndInfo
                    hasReplies={hasReplies}
                    replyCount={replyCount}
                    setShowReplyForm={setShowReplyForm}
                  />
                  {/* Vote buttons inline with reply options */}
                  <View>
                    <VoteButtons
                      comment={comment}
                      setComment={setComment}
                      size="small"
                    />
                  </View>
                </View>

                {/* Reply form */}
                {showReplyForm && (
                  <NewReplyForm
                    comment={comment}
                    setShowReplyForm={setShowReplyForm}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default SingleComment;
