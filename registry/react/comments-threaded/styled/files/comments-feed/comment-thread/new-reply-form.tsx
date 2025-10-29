import { useEffect, useState } from "react";
import {
  useCommentSection,
  useUser,
  Comment as CommentType,
} from "@replyke/react-js";
import useModalManager from "../../../hooks/use-modal-manager";

function NewReplyForm({
  comment,
  setShowReplyForm,
}: {
  comment: CommentType;
  setShowReplyForm: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { theme } = useModalManager();
  const { user } = useUser();

  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createComment, callbacks } = useCommentSection();

  const handleReply = async () => {
    if (!replyContent.trim() || isSubmitting) return;

    if (!user) {
      callbacks?.loginRequiredCallback();
      return;
    }
    setIsSubmitting(true);
    try {
      await createComment?.({
        content: replyContent.trim(),
        parentId: comment.id,
        mentions: [],
      });
      setReplyContent("");
      setShowReplyForm(false);
    } catch (error) {
      console.error("Error creating reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReply = () => {
    setShowReplyForm(false);
    setReplyContent("");
  };

  const [spinRotation, setSpinRotation] = useState(0);

  // Spinner animation effect
  useEffect(() => {
    if (isSubmitting) {
      const interval = setInterval(() => {
        setSpinRotation((prev) => (prev + 10) % 360);
      }, 16); // ~60fps
      return () => clearInterval(interval);
    }
  }, [isSubmitting]);

  return (
    <div
      style={{
        // 🎨 CUSTOMIZATION: Reply form styling (Default: 8px)
        marginTop: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          // 🎨 CUSTOMIZATION: Reply form styling (Default: white)
          backgroundColor: theme === 'dark' ? "#1F2937" : "#FFFFFF",
          borderRadius: "16px",
          border: `1px solid ${
            replyContent.trim().length > 0 ? (theme === 'dark' ? "#1E40AF" : "#BFDBFE") : (theme === 'dark' ? "#4B5563" : "#E5E7EB")
          }`,
          boxShadow:
            replyContent.trim().length > 0
              ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          transition: "all 300ms ease-in-out",
          // 🎨 CUSTOMIZATION: Reply form styling (Default: 6px, derived from 8-2)
          padding: "6px",
        }}
        onMouseEnter={(e) => {
          if (replyContent.trim().length === 0) {
            e.currentTarget.style.boxShadow =
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
          }
        }}
        onMouseLeave={(e) => {
          if (replyContent.trim().length === 0) {
            e.currentTarget.style.boxShadow =
              "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
          }
        }}
      >
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          // 🎨 CUSTOMIZATION: Reply form styling (Default placeholder)
          placeholder="Add your reply..."
          style={{
            flex: 1,
            // 🎨 CUSTOMIZATION: Reply form styling (Default: 6px 8px, derived from verticalPadding)
            padding: "6px 8px",
            // 🎨 CUSTOMIZATION: Reply form styling (Default: transparent)
            backgroundColor: "transparent",
            // 🎨 CUSTOMIZATION: Reply form styling (Default: gray-900)
            color: theme === 'dark' ? "#F9FAFB" : "#111827",
            // 🎨 CUSTOMIZATION: Reply form styling (Default: 12px)
            fontSize: "12px",
            lineHeight: "1.625",
            outline: "none",
            resize: "none",
            border: "none",
          }}
          rows={2}
        />
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginLeft: "4px",
          }}
        >
          <button
            onClick={handleCancelReply}
            style={{
              padding: "4px 8px",
              // 🎨 CUSTOMIZATION: Reply form styling (Default: 12px)
              fontSize: "12px",
              color: theme === 'dark' ? "#9CA3AF" : "#4B5563",
              borderRadius: "4px",
              transition: "colors 150ms ease-in-out",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? "#E5E7EB" : "#1F2937";
              e.currentTarget.style.backgroundColor = theme === 'dark' ? "#374151" : "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? "#9CA3AF" : "#4B5563";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleReply}
            disabled={!replyContent.trim() || isSubmitting}
            style={{
              flexShrink: 0,
              // 🎨 CUSTOMIZATION: Reply form styling (Default: 6px, derived from 8-2)
              padding: "6px",
              borderRadius: "50%",
              backgroundColor:
                replyContent.trim().length > 0 && !isSubmitting
                  ? (theme === 'dark' ? "#3B82F6" : "#2563EB")
                  : (theme === 'dark' ? "#4B5563" : "#E5E7EB"),
              color:
                replyContent.trim().length > 0 && !isSubmitting
                  ? "#FFFFFF"
                  : (theme === 'dark' ? "#6B7280" : "#9CA3AF"),
              boxShadow:
                "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              transition: "all 200ms ease-in-out",
              border: "none",
              cursor:
                !replyContent.trim() || isSubmitting
                  ? "not-allowed"
                  : "pointer",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (replyContent.trim().length > 0 && !isSubmitting) {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? "#2563EB" : "#1D4ED8";
                e.currentTarget.style.boxShadow =
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }
            }}
            onMouseLeave={(e) => {
              if (replyContent.trim().length > 0 && !isSubmitting) {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? "#3B82F6" : "#2563EB";
                e.currentTarget.style.boxShadow =
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = theme === 'dark' ? "2px solid #60A5FA" : "2px solid #3B82F6";
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
              e.currentTarget.style.outlineOffset = "0";
            }}
          >
            {isSubmitting ? (
              <div
                style={{
                  height: "12px",
                  width: "12px",
                  border: theme === 'dark' ? "1px solid #F9FAFB" : "1px solid #FFFFFF",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  transform: `rotate(${spinRotation}deg)`,
                  transition: "transform 0.1s linear",
                }}
              ></div>
            ) : (
              <svg
                style={{
                  // 🎨 CUSTOMIZATION: Reply form styling (Default: 12px)
                  height: "12px",
                  width: "12px",
                  transition: "transform 200ms ease-in-out",
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (replyContent.trim().length > 0) {
                    e.currentTarget.style.transform = "scale(1.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (replyContent.trim().length > 0) {
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewReplyForm;
