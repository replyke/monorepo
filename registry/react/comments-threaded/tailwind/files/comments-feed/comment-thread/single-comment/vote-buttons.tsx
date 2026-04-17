import {
  useCommentSection,
  useUser,
  Comment as CommentType,
  useReactionToggle,
} from "@replyke/react-js";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  comment: CommentType;
  size?: "small" | "normal";
}

function VoteButtons({
  comment,
  size = "small",
}: VoteButtonsProps) {
  const { user } = useUser();
  const { callbacks } = useCommentSection();

  const { currentReaction, reactionCounts, toggleReaction } = useReactionToggle({
    targetType: "comment",
    targetId: comment.id,
    initialReaction: comment.userReaction,
    initialReactionCounts: comment.reactionCounts,
  });

  const netScore = (reactionCounts.upvote || 0) - (reactionCounts.downvote || 0);

  const userVote: "up" | "down" | null = currentReaction === "upvote"
    ? "up"
    : currentReaction === "downvote"
    ? "down"
    : null;

  const handleVote = (voteType: "up" | "down") => {
    toggleReaction({ reactionType: voteType === "up" ? "upvote" : "downvote" });
  };

  // 🎨 CUSTOMIZATION: Vote button sizing
  const iconClass = size === "small" ? "w-3 h-3" : "w-4 h-4";
  const textClass = size === "small" ? "text-xs" : "text-sm";
  const paddingClass = size === "small" ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <div
      className={cn(
        // 🎨 CUSTOMIZATION: Vote button container styling
        "inline-flex items-center",
        "bg-gray-50 dark:bg-gray-700",
        "rounded-full",
        paddingClass,
        "gap-1"
      )}
    >
      {/* Upvote Button */}
      <button
        onClick={() => {
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
        className={cn(
          // 🎨 CUSTOMIZATION: Upvote button styling
          "p-1 rounded-full",
          "transition-colors duration-150",
          "flex items-center justify-center",
          "border-none cursor-pointer",
          userVote === "up"
            ? "bg-blue-500 dark:bg-blue-400 text-white"
            : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
        )}
        title="Upvote"
      >
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 15.75 7.5-7.5 7.5 7.5"
          />
        </svg>
      </button>

      {/* Score */}
      <span
        className={cn(
          // 🎨 CUSTOMIZATION: Score display styling
          "font-medium min-w-[20px] text-center",
          textClass,
          netScore > 0
            ? "text-blue-500 dark:text-blue-400"
            : netScore < 0
            ? "text-red-500 dark:text-red-400"
            : "text-gray-700 dark:text-gray-300"
        )}
      >
        {netScore}
      </span>

      {/* Downvote Button */}
      <button
        onClick={() => {
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
        className={cn(
          // 🎨 CUSTOMIZATION: Downvote button styling
          "p-1 rounded-full",
          "transition-colors duration-150",
          "flex items-center justify-center",
          "border-none cursor-pointer",
          userVote === "down"
            ? "bg-red-500 dark:bg-red-400 text-white"
            : "bg-transparent text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
        )}
        title="Downvote"
      >
        <svg
          className={iconClass}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
    </div>
  );
}

export default VoteButtons;
