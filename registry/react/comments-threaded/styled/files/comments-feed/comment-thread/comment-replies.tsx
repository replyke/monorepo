import React from "react";
import { Comment as CommentType } from "@replyke/react-js";
import { CommentThreadProps } from "./comment-thread";
import useModalManager from "../../../hooks/use-modal-manager";

interface CommentRepliesProps {
  depth: number;
  isCollapsed: boolean;
  loading: boolean;
  visibleReplies: CommentType[];
  hiddenRepliesCount: number;
  showAllReplies: boolean;
  onShowAllReplies: () => void;
  onDeleteComment?: (commentId: string) => void;
  onReportComment?: (commentId: string) => void;
  CommentThreadComponent: React.ComponentType<CommentThreadProps>;
}

function CommentReplies({
  depth,
  isCollapsed,
  loading,
  visibleReplies,
  hiddenRepliesCount,
  showAllReplies,
  onShowAllReplies,
  onDeleteComment,
  onReportComment,
  CommentThreadComponent,
}: CommentRepliesProps) {
  const { theme } = useModalManager();

  // Don't render anything if collapsed or no replies
  if (isCollapsed || visibleReplies.length === 0) {
    return null;
  }

  return (
    <div
    // style={{ marginTop: "8px" }}
    >
      {/* {loading && (
        <div
          style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}
        >
          Loading replies...
        </div>
      )} */}

      {visibleReplies.map((reply: CommentType, index: number) => (
        <CommentThreadComponent
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          isLastReply={index === visibleReplies.length - 1}
          onDeleteComment={onDeleteComment}
          onReportComment={onReportComment}
        />
      ))}

      {/* Load more replies button */}
      {hiddenRepliesCount > 0 && !showAllReplies && (
        <div style={{ marginTop: "12px", marginLeft: "4px" }}>
          <button
            onClick={onShowAllReplies}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: theme === 'dark' ? "#3B82F6" : "#2563EB",
              fontWeight: "500",
              transition: "all 150ms ease-in-out",
              padding: "4px 8px",
              borderRadius: "9999px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? "#2563EB" : "#1D4ED8";
              e.currentTarget.style.backgroundColor = theme === 'dark' ? "#1E3A8A" : "#EFF6FF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? "#3B82F6" : "#2563EB";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              style={{ width: "12px", height: "12px" }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            {hiddenRepliesCount} more{" "}
            {hiddenRepliesCount === 1 ? "reply" : "replies"}
          </button>
        </div>
      )}
    </div>
  );
}

export default CommentReplies;
