import React from "react";
import useModalManager from "../../../../hooks/use-modal-manager";

function ReplyButtonAndInfo({
  hasReplies,
  replyCount,
  setShowReplyForm,
}: {
  hasReplies: boolean;
  replyCount: number;
  setShowReplyForm: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { theme } = useModalManager();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        // 🎨 CUSTOMIZATION: Reply button styling (Default: 16px)
        gap: "16px",
        // 🎨 CUSTOMIZATION: Reply button styling (Default: 12px)
        fontSize: "12px",
      }}
    >
      <button
        onClick={() => setShowReplyForm((prev) => !prev)}
        style={{
          // 🎨 CUSTOMIZATION: Reply button styling (Default: gray-500)
          color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
          // 🎨 CUSTOMIZATION: Reply button styling (Default: medium)
          fontWeight: 500,
          padding: "4px 8px",
          borderRadius: "4px",
          marginLeft: "-8px",
          transition: "all 150ms ease-in-out",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = theme === 'dark' ? "#3B82F6" : "#2563EB";
          e.currentTarget.style.backgroundColor = theme === 'dark' ? "#1E3A8A" : "#EFF6FF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = theme === 'dark' ? "#9CA3AF" : "#6B7280";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        Reply
      </button>
      {hasReplies && (
        <span
          style={{
            // 🎨 CUSTOMIZATION: Reply button styling (Default: gray-500)
            color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
          }}
        >
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </span>
      )}
    </div>
  );
}

export default ReplyButtonAndInfo;
