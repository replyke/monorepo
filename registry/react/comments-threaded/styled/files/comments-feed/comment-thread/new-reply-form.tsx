import { useEffect, useState } from "react";
import {
  useCommentSection,
  useUser,
  Comment as CommentType,
} from "@replyke/react-js";

function NewReplyForm({
  comment,
  setShowReplyForm,
}: {
  comment: CommentType;
  setShowReplyForm: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { user } = useUser();

  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createComment, callbacks } = useCommentSection();

  // 🎨 CUSTOMIZATION: Reply form styling
  const backgroundColor = "#FFFFFF"; // Default: white
  const verticalPadding = 8; // Default: 8px
  const placeholderText = "Add your reply..."; // Default placeholder
  const textareaTextSize = 12; // Default: 12px
  const textareaTextColor = "#111827"; // Default: gray-900
  const textareaBackgroundColor = "transparent"; // Default: transparent

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
    <div style={{ marginTop: `${verticalPadding}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          backgroundColor: backgroundColor,
          borderRadius: "16px",
          border: `1px solid ${
            replyContent.trim().length > 0 ? "#BFDBFE" : "#E5E7EB"
          }`,
          boxShadow:
            replyContent.trim().length > 0
              ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          transition: "all 300ms ease-in-out",
          padding: `${verticalPadding - 2}px`,
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
          placeholder={placeholderText}
          style={{
            flex: 1,
            padding: `${verticalPadding - 2}px ${verticalPadding}px`,
            backgroundColor: textareaBackgroundColor,
            color: textareaTextColor,
            fontSize: `${textareaTextSize}px`,
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
              fontSize: `${textareaTextSize}px`,
              color: "#4B5563",
              borderRadius: "4px",
              transition: "colors 150ms ease-in-out",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#1F2937";
              e.currentTarget.style.backgroundColor = "#F3F4F6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#4B5563";
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
              padding: `${verticalPadding - 2}px`,
              borderRadius: "50%",
              backgroundColor:
                replyContent.trim().length > 0 && !isSubmitting
                  ? "#2563EB"
                  : "#E5E7EB",
              color:
                replyContent.trim().length > 0 && !isSubmitting
                  ? "#FFFFFF"
                  : "#9CA3AF",
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
                e.currentTarget.style.backgroundColor = "#1D4ED8";
                e.currentTarget.style.boxShadow =
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }
            }}
            onMouseLeave={(e) => {
              if (replyContent.trim().length > 0 && !isSubmitting) {
                e.currentTarget.style.backgroundColor = "#2563EB";
                e.currentTarget.style.boxShadow =
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = "2px solid #3B82F6";
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
                  border: "1px solid #FFFFFF",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  transform: `rotate(${spinRotation}deg)`,
                  transition: "transform 0.1s linear",
                }}
              ></div>
            ) : (
              <svg
                style={{
                  height: `${textareaTextSize}px`,
                  width: `${textareaTextSize}px`,
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
