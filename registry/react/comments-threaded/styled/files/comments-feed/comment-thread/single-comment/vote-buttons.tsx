import {
  useCommentSection,
  useUser,
  Comment as CommentType,
  useReactionToggle,
} from "@replyke/react-js";
import useUIState from "../../../../hooks/use-ui-state";

interface VoteButtonsProps {
  comment: CommentType;
  size?: "small" | "normal";
}

function VoteButtons({
  comment,
  size = "small",
}: VoteButtonsProps) {
  const { theme } = useUIState();
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

  // 🎨 CUSTOMIZATION: Vote button styling (Default: 12px for small, 16px for normal)
  const iconSize =
    size === "small"
      ? { width: "12px", height: "12px" }
      : { width: "16px", height: "16px" };
  // 🎨 CUSTOMIZATION: Score display styling (Default: 12px for small, 14px for normal)
  const textSize = size === "small" ? "12px" : "14px";
  const padding = size === "small" ? "4px 8px" : "6px 12px";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        // 🎨 CUSTOMIZATION: Vote button styling (Default: gray-100)
        backgroundColor: theme === 'dark' ? "#374151" : "#F3F4F6",
        borderRadius: "9999px",
        padding: padding,
        gap: "4px",
      }}
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
        style={{
          padding: "4px",
          borderRadius: "50%",
          transition: "colors 150ms ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // 🎨 CUSTOMIZATION: Vote button styling (Default: blue-500)
          backgroundColor: userVote === "up" ? (theme === 'dark' ? "#60A5FA" : "#3B82F6") : "transparent",
          // 🎨 CUSTOMIZATION: Vote button styling (Default: gray-500 when neutral)
          color: userVote === "up" ? "#FFFFFF" : (theme === 'dark' ? "#9CA3AF" : "#6B7280"),
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (userVote !== "up") {
            // 🎨 CUSTOMIZATION: Vote button styling (Default: blue-500)
            e.currentTarget.style.color = theme === 'dark' ? "#60A5FA" : "#3B82F6";
            // 🎨 CUSTOMIZATION: Vote button styling (Default: blue-50)
            e.currentTarget.style.backgroundColor = theme === 'dark' ? "#1E3A8A" : "#EFF6FF";
          }
        }}
        onMouseLeave={(e) => {
          if (userVote !== "up") {
            // 🎨 CUSTOMIZATION: Vote button styling (Default: gray-500)
            e.currentTarget.style.color = theme === 'dark' ? "#9CA3AF" : "#6B7280";
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
        title="Upvote"
      >
        <svg
          style={iconSize}
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
        style={{
          // 🎨 CUSTOMIZATION: Score display styling (Default: medium)
          fontWeight: 500,
          fontSize: textSize,
          minWidth: "20px",
          textAlign: "center",
          // 🎨 CUSTOMIZATION: Score display styling (Default: blue-500 for positive, red-500 for negative, gray-700 for neutral)
          color:
            netScore > 0
              ? (theme === 'dark' ? "#60A5FA" : "#3B82F6")
              : netScore < 0
              ? (theme === 'dark' ? "#F87171" : "#EF4444")
              : (theme === 'dark' ? "#D1D5DB" : "#374151"),
        }}
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
          if (user && !user.username) {
            callbacks?.usernameRequiredCallback?.();
            return;
          }
          handleVote("down");
        }}
        style={{
          padding: "4px",
          borderRadius: "50%",
          transition: "colors 150ms ease-in-out",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // 🎨 CUSTOMIZATION: Vote button styling (Default: red-500)
          backgroundColor: userVote === "down" ? (theme === 'dark' ? "#F87171" : "#EF4444") : "transparent",
          // 🎨 CUSTOMIZATION: Vote button styling (Default: gray-500 when neutral)
          color: userVote === "down" ? "#FFFFFF" : (theme === 'dark' ? "#9CA3AF" : "#6B7280"),
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (userVote !== "down") {
            // 🎨 CUSTOMIZATION: Vote button styling (Default: red-500)
            e.currentTarget.style.color = theme === 'dark' ? "#F87171" : "#EF4444";
            // 🎨 CUSTOMIZATION: Vote button styling (Default: red-50)
            e.currentTarget.style.backgroundColor = theme === 'dark' ? "#7F1D1D" : "#FEF2F2";
          }
        }}
        onMouseLeave={(e) => {
          if (userVote !== "down") {
            // 🎨 CUSTOMIZATION: Vote button styling (Default: gray-500)
            e.currentTarget.style.color = theme === 'dark' ? "#9CA3AF" : "#6B7280";
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
        title="Downvote"
      >
        <svg
          style={iconSize}
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
