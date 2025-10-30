import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  useCommentSection,
  useUser,
  useMentions,
  useProject,
  handleError,
} from "@replyke/react-js";
import {
  useTextareaCursorIndicator,
  GiphyContainer,
} from "@replyke/ui-core-react-js";
import MentionSuggestions from "./mention-suggestions";
import { cn } from "@/lib/utils";

function NewCommentForm() {
  const { user } = useUser();
  const { project } = useProject();
  const giphyApiKey = project?.integrations.find((int) => int.name === "giphy")
    ?.data.apiKey;

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGiphyVisible, setIsGiphyVisible] = useState(false);
  const { createComment, callbacks } = useCommentSection();

  const hasContent = content.trim().length > 0;

  const { cursorPosition, isSelectionActive } = useTextareaCursorIndicator({
    textAreaRef,
  });

  const {
    isMentionActive,
    loading,
    mentionSuggestions,
    handleMentionClick,
    mentions,
    addMention,
    resetMentions,
  } = useMentions({
    content: textAreaRef.current?.value || "",
    setContent: (value: string) => {
      if (textAreaRef.current) {
        textAreaRef.current.value = value;
        setContent(value);
      }
    },
    focus: () => textAreaRef.current?.focus(),
    cursorPosition,
    isSelectionActive,
  });

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const textArea = textAreaRef.current;
      if (!textArea || isSubmitting) return;

      if (!hasContent) {
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

      const tempContent = textArea.value.trim();
      setIsSubmitting(true);

      try {
        await createComment?.({ content: tempContent, mentions });
        textArea.value = "";
        setContent("");
        resetMentions();
      } catch (error) {
        console.error("Error creating comment:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      hasContent,
      isSubmitting,
      user,
      createComment,
      mentions,
      resetMentions,
      callbacks,
    ]
  );

  const handleCreateGif = useCallback(
    async (gif: {
      id: string;
      url: string;
      gifUrl: string;
      gifPreviewUrl: string;
      altText: string | undefined;
      aspectRatio: number;
    }) => {
      if (!user) {
        callbacks?.loginRequiredCallback?.();
        setIsGiphyVisible(false);
        return;
      }

      if (!user.username && callbacks?.usernameRequiredCallback) {
        callbacks.usernameRequiredCallback();
        setIsGiphyVisible(false);
        return;
      }

      const textArea = textAreaRef.current;
      if (!textArea) throw new Error("Can not find textarea");

      textArea.value = "";
      setContent("");
      resetMentions();
      setIsGiphyVisible(false);

      try {
        await createComment!({ gif, mentions });
      } catch (err) {
        handleError(err, "Creating comment failed: ");
      }
    },
    [createComment, mentions, resetMentions, user, callbacks]
  );

  // Add keyboard event handler for Enter key
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    };

    const textArea = textAreaRef.current;
    textArea?.addEventListener("keydown", handleKeyDown);

    return () => {
      textArea?.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSubmit]);

  return (
    <>
      {giphyApiKey ? (
        <GiphyContainer
          giphyApiKey={giphyApiKey}
          onClickBack={() => setIsGiphyVisible(false)}
          onSelectGif={(selected) => handleCreateGif(selected)}
          visible={isGiphyVisible}
        />
      ) : null}
      <form onSubmit={handleSubmit} className="relative">
        <MentionSuggestions
          isMentionActive={isMentionActive}
          isLoadingMentions={loading}
          mentionSuggestions={mentionSuggestions}
          handleMentionClick={handleMentionClick}
        />
        <div
          className={cn(
            // 🎨 CUSTOMIZATION: Comment form styling
            "flex items-end",
            "bg-white dark:bg-gray-800",
            "rounded-2xl",
            "p-2",
            "transition-all duration-300",
            "shadow-sm",
            hasContent
              ? "border border-blue-300 dark:border-blue-800 shadow-md"
              : "border border-gray-200 dark:border-gray-600 hover:shadow-md"
          )}
        >
          <textarea
            ref={textAreaRef}
            onChange={(e) => setContent(e.target.value)}
            // 🎨 CUSTOMIZATION: Comment form styling (Default placeholder)
            placeholder="Add your reply..."
            className={cn(
              // 🎨 CUSTOMIZATION: Comment form styling
              "flex-1 p-2",
              "bg-transparent",
              "text-gray-900 dark:text-gray-50",
              "text-xs leading-relaxed",
              "outline-none resize-none border-none"
            )}
            rows={2}
          />
          {!hasContent && giphyApiKey ? (
            <button
              type="button"
              onClick={() => setIsGiphyVisible(true)}
              disabled={isSubmitting}
              className={cn(
                // 🎨 CUSTOMIZATION: Comment form styling
                "flex-shrink-0 p-2",
                "border-none outline-none",
                "font-normal text-xs",
                "text-gray-50 dark:text-gray-50",
                "cursor-pointer bg-transparent"
              )}
            >
              GIF
            </button>
          ) : (
            <button
              type="submit"
              disabled={!hasContent || isSubmitting}
              className={cn(
                // 🎨 CUSTOMIZATION: Comment form styling
                "flex-shrink-0 p-2",
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
              <svg
                className={cn(
                  // 🎨 CUSTOMIZATION: Comment form styling
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
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export default NewCommentForm;
