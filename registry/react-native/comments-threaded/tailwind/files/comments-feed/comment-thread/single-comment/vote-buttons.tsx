import { View, Text, TouchableOpacity } from "react-native";
import {
  useCommentSection,
  useUser,
  Comment as CommentType,
  useCommentVotes,
} from "@replyke/core";
import useUIState from "../../../../hooks/use-ui-state";

interface VoteButtonsProps {
  comment: CommentType;
  setComment: React.Dispatch<React.SetStateAction<CommentType>>;
  size?: "small" | "normal";
}

function VoteButtons({
  comment,
  setComment,
  size = "small",
}: VoteButtonsProps) {
  const { user } = useUser();
  const { callbacks } = useCommentSection();
  const { theme } = useUIState();

  const {
    upvoteComment,
    downvoteComment,
    removeCommentUpvote,
    removeCommentDownvote,
  } = useCommentVotes({
    comment,
    setComment,
  });

  const upvotes = comment.upvotes?.length || 0;
  const downvotes = comment.downvotes?.length || 0;
  const netScore = upvotes - downvotes;

  // Check if user has voted on this comment
  const userUpvotedComment = !!(user && comment.upvotes.includes(user.id));
  const userDownvotedComment = !!(user && comment.downvotes.includes(user.id));
  const userVote: "up" | "down" | null = userUpvotedComment
    ? "up"
    : userDownvotedComment
    ? "down"
    : null;

  const handleVote = (voteType: "up" | "down") => {
    if (voteType === "up") {
      if (userUpvotedComment) {
        removeCommentUpvote?.();
      } else {
        upvoteComment?.();
      }
    } else {
      if (userDownvotedComment) {
        removeCommentDownvote?.();
      } else {
        downvoteComment?.();
      }
    }
  };

  // Size-based styling
  const iconSize = size === "small" ? 12 : 16;
  const containerPadding = size === "small" ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <View
      className={`flex-row items-center rounded-full gap-1 ${containerPadding} ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}
    >
      {/* Upvote Button */}
      <TouchableOpacity
        onPress={() => {
          if (!user) {
            callbacks?.loginRequiredCallback?.();
            return;
          }
          if (!user.username && callbacks?.usernameRequiredCallback) {
            callbacks.usernameRequiredCallback();
            return;
          }
          handleVote("up");
        }}
        className={`p-1 rounded-full items-center justify-center ${
          userVote === "up"
            ? theme === 'dark'
              ? 'bg-blue-400'
              : 'bg-blue-500'
            : 'bg-transparent'
        }`}
      >
        <Text
          style={{ fontSize: iconSize, lineHeight: iconSize }}
          className={
            userVote === "up"
              ? 'text-white'
              : theme === 'dark'
                ? 'text-gray-400'
                : 'text-gray-500'
          }
        >
          ▲
        </Text>
      </TouchableOpacity>

      {/* Score */}
      <Text
        className={`font-medium text-center min-w-[20px] ${
          size === "small" ? "text-xs" : "text-sm"
        } ${
          netScore > 0
            ? theme === 'dark'
              ? 'text-blue-400'
              : 'text-blue-500'
            : netScore < 0
              ? theme === 'dark'
                ? 'text-red-400'
                : 'text-red-500'
              : theme === 'dark'
                ? 'text-gray-300'
                : 'text-gray-700'
        }`}
      >
        {netScore}
      </Text>

      {/* Downvote Button */}
      <TouchableOpacity
        onPress={() => {
          if (!user) {
            callbacks?.loginRequiredCallback?.();
            return;
          }
          if (!user.username && callbacks?.usernameRequiredCallback) {
            callbacks.usernameRequiredCallback();
            return;
          }
          handleVote("down");
        }}
        className={`p-1 rounded-full items-center justify-center ${
          userVote === "down"
            ? theme === 'dark'
              ? 'bg-red-400'
              : 'bg-red-500'
            : 'bg-transparent'
        }`}
      >
        <Text
          style={{ fontSize: iconSize, lineHeight: iconSize }}
          className={
            userVote === "down"
              ? 'text-white'
              : theme === 'dark'
                ? 'text-gray-400'
                : 'text-gray-500'
          }
        >
          ▼
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default VoteButtons;
