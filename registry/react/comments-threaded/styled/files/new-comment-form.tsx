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
import useUIState from "../hooks/use-ui-state";

function NewCommentForm() {
  const { theme } = useUIState();
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

      if (user && !user.username) {
        callbacks?.usernameRequiredCallback?.();
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

      if (user && !user.username) {
        callbacks?.usernameRequiredCallback?.();
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
      <form onSubmit={handleSubmit} style={{ position: "relative" }}>
        <MentionSuggestions
          isMentionActive={isMentionActive}
          isLoadingMentions={loading}
          mentionSuggestions={mentionSuggestions}
          handleMentionClick={handleMentionClick}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            // 🎨 CUSTOMIZATION: Comment form styling (Default: white)
            backgroundColor: theme === 'dark' ? "#1F2937" : "#FFFFFF",
            borderRadius: "16px",
            border: `1px solid ${hasContent ? (theme === 'dark' ? "#1E40AF" : "#BFDBFE") : (theme === 'dark' ? "#4B5563" : "#E5E7EB")}`,
            boxShadow: hasContent
              ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            transition: "all 300ms ease-in-out",
            // 🎨 CUSTOMIZATION: Comment form styling (Default: 8px)
            padding: "8px",
          }}
          onMouseEnter={(e) => {
            if (!hasContent) {
              e.currentTarget.style.boxShadow =
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
            }
          }}
          onMouseLeave={(e) => {
            if (!hasContent) {
              e.currentTarget.style.boxShadow =
                "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
            }
          }}
        >
          <textarea
            ref={textAreaRef}
            onChange={(e) => setContent(e.target.value)}
            // 🎨 CUSTOMIZATION: Comment form styling (Default placeholder)
            placeholder="Add your reply..."
            style={{
              flex: 1,
              // 🎨 CUSTOMIZATION: Comment form styling (Default: 8px)
              padding: "8px",
              // 🎨 CUSTOMIZATION: Comment form styling (Default: transparent)
              backgroundColor: "transparent",
              // 🎨 CUSTOMIZATION: Comment form styling (Default: gray-900)
              color: theme === 'dark' ? "#F9FAFB" : "#111827",
              // 🎨 CUSTOMIZATION: Comment form styling (Default: 12px)
              fontSize: "12px",
              lineHeight: "1.625",
              outline: "none",
              resize: "none",
              border: "none",
            }}
            rows={2}
          />
          {!hasContent && giphyApiKey ? (
            <button
              type="button"
              onClick={() => setIsGiphyVisible(true)}
              disabled={isSubmitting}
              style={{
                flexShrink: 0,
                // 🎨 CUSTOMIZATION: Comment form styling (Default: 8px)
                padding: "8px",
                border: "none",
                outline: "none",
                // 🎨 CUSTOMIZATION: Comment form styling (Default: regular)
                fontWeight: 400,
                // 🎨 CUSTOMIZATION: Comment form styling (Default: 12px)
                fontSize: "12px",
                // 🎨 CUSTOMIZATION: Comment form styling (Default: white)
                color: theme === 'dark' ? "#F9FAFB" : "#FFFFFF",
                cursor: "pointer",
                backgroundColor: "transparent",
              }}
            >
              GIF
            </button>
          ) : (
            <button
              type="submit"
              disabled={!hasContent || isSubmitting}
              style={{
                flexShrink: 0,
                // 🎨 CUSTOMIZATION: Comment form styling (Default: 8px)
                padding: "8px",
                borderRadius: "50%",
                backgroundColor:
                  hasContent && !isSubmitting ? (theme === 'dark' ? "#3B82F6" : "#2563EB") : (theme === 'dark' ? "#4B5563" : "#E5E7EB"),
                color: hasContent && !isSubmitting ? "#FFFFFF" : (theme === 'dark' ? "#6B7280" : "#9CA3AF"),
                boxShadow:
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                transition: "all 200ms ease-in-out",
                border: "none",
                cursor: !hasContent || isSubmitting ? "not-allowed" : "pointer",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (hasContent && !isSubmitting) {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? "#2563EB" : "#1D4ED8";
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (hasContent && !isSubmitting) {
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
              <svg
                style={{
                  // 🎨 CUSTOMIZATION: Comment form styling (Default: 12px)
                  height: "12px",
                  width: "12px",
                  transition: "transform 200ms ease-in-out",
                  transform: hasContent ? "scale(1)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (hasContent) {
                    e.currentTarget.style.transform = "scale(1.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasContent) {
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
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export default NewCommentForm;
