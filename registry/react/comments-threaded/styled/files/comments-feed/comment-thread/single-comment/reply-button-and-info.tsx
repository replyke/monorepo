import React from "react";

function ReplyButtonAndInfo({
  hasReplies,
  replyCount,
  setShowReplyForm,
}: {
  hasReplies: boolean;
  replyCount: number;
  setShowReplyForm: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // 🎨 CUSTOMIZATION: Reply button styling
  const replyButtonFontSize = 12; // Default: 12px
  const replyButtonFontWeight = 500; // Default: medium
  const replyButtonFontColor = "#6B7280"; // Default: gray-500
  const actionsItemGap = 16; // Default: 16px
  const fromNowFontColor = "#6B7280"; // Default: gray-500
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: `${actionsItemGap}px`,
        fontSize: `${replyButtonFontSize}px`,
      }}
    >
      <button
        onClick={() => setShowReplyForm((prev) => !prev)}
        style={{
          color: replyButtonFontColor,
          fontWeight: replyButtonFontWeight,
          padding: "4px 8px",
          borderRadius: "4px",
          marginLeft: "-8px",
          transition: "all 150ms ease-in-out",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#2563EB";
          e.currentTarget.style.backgroundColor = "#EFF6FF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#6B7280";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        Reply
      </button>
      {hasReplies && (
        <span style={{ color: fromNowFontColor }}>
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </span>
      )}
    </div>
  );
}

export default ReplyButtonAndInfo;
