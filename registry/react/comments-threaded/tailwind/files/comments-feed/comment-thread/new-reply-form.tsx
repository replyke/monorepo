import { useEffect, useState } from "react";
import {
  useCommentSection,
  useUser,
  Comment as CommentType,
} from "@replyke/react-js";
import { cn } from "@/lib/utils";

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

  const handleReply = async () => {
    if (isSubmitting) return;

    if (!replyContent.trim()) {
      callbacks?.commentTooShortCallback?.();
      return;
    }

    if (!user) {
      callbacks?.loginRequiredCallback();
      return;
    }

    if (!user.username && callbacks?.usernameRequiredCallback) {
      callbacks.usernameRequiredCallback();
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

  const hasContent = replyContent.trim().length > 0;

  return (
    <div
      className="mt-2"
      // 🎨 CUSTOMIZATION: Reply form spacing
    >
      <div
        className={cn(
          // 🎨 CUSTOMIZATION: Reply form styling
          "flex items-end",
          "bg-white dark:bg-gray-800",
          "rounded-2xl",
          "p-1.5",
          "transition-all duration-300",
          "shadow-sm",
          hasContent
            ? "border border-blue-300 dark:border-blue-900 shadow-md"
            : "border border-gray-200 dark:border-gray-600 hover:shadow-md"
        )}
      >
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          // 🎨 CUSTOMIZATION: Reply form placeholder
          placeholder="Add your reply..."
          className={cn(
            // 🎨 CUSTOMIZATION: Reply form textarea styling
            "flex-1 py-1.5 px-2",
            "bg-transparent",
            "text-gray-900 dark:text-gray-50",
            "text-xs leading-relaxed",
            "outline-none resize-none border-none"
          )}
          rows={2}
        />
        <div className="flex gap-1 ml-1">
          <button
            onClick={handleCancelReply}
            className={cn(
              // 🎨 CUSTOMIZATION: Cancel button styling
              "px-2 py-1",
              "text-xs",
              "text-gray-600 dark:text-gray-400",
              "rounded",
              "transition-colors duration-150",
              "bg-transparent border-none cursor-pointer",
              "hover:text-gray-800 dark:hover:text-gray-200",
              "hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleReply}
            disabled={!hasContent || isSubmitting}
            className={cn(
              // 🎨 CUSTOMIZATION: Submit button styling
              "flex-shrink-0 p-1.5",
              "rounded-full",
              "shadow-sm",
              "transition-all duration-200",
              "border-none outline-none",
              "focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              hasContent && !isSubmitting
                ? "bg-blue-600 dark:bg-blue-500 text-white cursor-pointer hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md"
                : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <div
                className="h-3 w-3 border border-gray-50 dark:border-gray-50 border-t-transparent rounded-full transition-transform duration-100 linear"
                style={{
                  transform: `rotate(${spinRotation}deg)`,
                }}
              ></div>
            ) : (
              <svg
                className={cn(
                  // 🎨 CUSTOMIZATION: Submit icon styling
                  "h-3 w-3",
                  "transition-transform duration-200",
                  hasContent && "hover:scale-110"
                )}
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
