import {
  useCommentSection,
  useUser,
  Comment as CommentType,
  useCommentVotes,
} from "@replyke/react-js";

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

  // 🎨 CUSTOMIZATION: Vote button styling
  const voteIconSize = 12; // Default: 12px
  const upvoteColor = "#3B82F6"; // Default: blue-500
  const upvoteHoverColor = "#EFF6FF"; // Default: blue-50
  const downvoteColor = "#EF4444"; // Default: red-500
  const downvoteHoverColor = "#FEF2F2"; // Default: red-50
  const voteContainerBackground = "#F3F4F6"; // Default: gray-100
  const neutralVoteColor = "#6B7280"; // Default: gray-500

  // 🎨 CUSTOMIZATION: Score display styling
  const scoreTextSize = 12; // Default: 12px
  const scoreTextWeight = 500; // Default: medium
  const scoreTextColor = "#374151"; // Default: gray-700
  const positiveScoreColor = "#3B82F6"; // Default: blue-500
  const negativeScoreColor = "#EF4444"; // Default: red-500

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

  const iconSize =
    size === "small"
      ? { width: `${voteIconSize}px`, height: `${voteIconSize}px` }
      : { width: `${voteIconSize + 4}px`, height: `${voteIconSize + 4}px` };
  const textSize =
    size === "small" ? `${scoreTextSize}px` : `${scoreTextSize + 2}px`;
  const padding = size === "small" ? "4px 8px" : "6px 12px";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: voteContainerBackground,
        borderRadius: "9999px",
        padding: padding,
        gap: "4px",
      }}
    >
      {/* Upvote Button */}
      <button
        onClick={() => {
          if (!user) {
            (
              callbacks?.loginRequiredCallback ||
              (() => alert("Please login first."))
            )();
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
          backgroundColor: userVote === "up" ? upvoteColor : "transparent",
          color: userVote === "up" ? "#FFFFFF" : neutralVoteColor,
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (userVote !== "up") {
            e.currentTarget.style.color = upvoteColor;
            e.currentTarget.style.backgroundColor = upvoteHoverColor;
          }
        }}
        onMouseLeave={(e) => {
          if (userVote !== "up") {
            e.currentTarget.style.color = neutralVoteColor;
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
          fontWeight: scoreTextWeight,
          fontSize: textSize,
          minWidth: "20px",
          textAlign: "center",
          color:
            netScore > 0
              ? positiveScoreColor
              : netScore < 0
              ? negativeScoreColor
              : scoreTextColor,
        }}
      >
        {netScore}
      </span>

      {/* Downvote Button */}
      <button
        onClick={() => {
          if (!user) {
            (
              callbacks?.loginRequiredCallback ||
              (() => alert("Please login first."))
            )();
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
          backgroundColor: userVote === "down" ? downvoteColor : "transparent",
          color: userVote === "down" ? "#FFFFFF" : neutralVoteColor,
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          if (userVote !== "down") {
            e.currentTarget.style.color = downvoteColor;
            e.currentTarget.style.backgroundColor = downvoteHoverColor;
          }
        }}
        onMouseLeave={(e) => {
          if (userVote !== "down") {
            e.currentTarget.style.color = neutralVoteColor;
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
