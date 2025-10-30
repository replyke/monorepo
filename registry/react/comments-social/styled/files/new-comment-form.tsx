import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  useCommentSection,
  handleError,
  useMentions,
  useUser,
  useProject,
} from "@replyke/react-js";
import {
  resetButton,
  resetDiv,
  resetTextInput,
  UserAvatar,
  GiphyContainer,
  EmojiSuggestions,
  useTextareaCursorIndicator,
} from "@replyke/ui-core-react-js";

import ReplyBanner from "./reply-banner";
import MentionSuggestions from "./mention-suggestions";
import useUIState from "../hooks/use-ui-state";

function NewCommentForm({ withEmojis }: { withEmojis?: boolean }) {
  const { user } = useUser();
  const { project } = useProject();
  const giphyApiKey = project?.integrations.find((int) => int.name === "giphy")
    ?.data.apiKey;

  const { pushMention, createComment, submittingComment, callbacks } =
    useCommentSection();
  const { theme } = useUIState();

  const [isGiphyVisible, setIsGiphyVisible] = useState(false);

  // 🎨 CUSTOMIZATION: Form background color (Default: white)
  const backgroundColor = theme === 'dark' ? '#1F2937' : '#fff';

  // 🎨 CUSTOMIZATION: Form layout (Default: true - show avatar)
  const withAvatar = true;

  // 🎨 CUSTOMIZATION: Form spacing (Default: 8px gap, 8px vertical padding)
  const itemsGap = 8;
  const verticalPadding = 8;
  const paddingLeft = 8;
  const paddingRight = 16;

  // 🎨 CUSTOMIZATION: Avatar size (Default: 32px)
  const authorAvatarSize = 32;

  // 🎨 CUSTOMIZATION: Textarea styling
  const placeholderText = "Add a comment...";
  const textareaTextSize = 14;
  const textareaBackgroundColor = theme === 'dark' ? '#1F2937' : '#fff';
  const textareaTextColor = theme === 'dark' ? '#E5E7EB' : '#000';

  // 🎨 CUSTOMIZATION: Post button styling
  const postButtonText = "Post";
  const postButtonFontSize = 14;
  const postButtonFontColor = theme === 'dark' ? '#60A5FA' : '#0A99F6'; // Blue
  const postButtonFontWeight = 600;

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(""); // We've managed everything via the ref, but we need this to know if we render a post button or a show gifs button

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
      if (textAreaRef.current) textAreaRef.current.value = value;
    },
    focus: () => textAreaRef.current?.focus(),
    cursorPosition,
    isSelectionActive,
  });

  const handleCreateComment = useCallback(async () => {
    // Even though createComment checks for user and triggers the loginRequiredCallback - we will regard it as backup and check here too before clearing the textarea for better UX
    if (!user) {
      callbacks?.loginRequiredCallback?.();
      return;
    }

    const textArea = textAreaRef.current;
    if (!textArea) throw new Error("Can not find textarea");

    const tempContent = textArea.value;
    textArea.value = "";

    try {
      await createComment!({ content: tempContent, mentions });
      resetMentions();
    } catch (err) {
      textArea.value = tempContent;

      handleError(err, "Creating comment failed: ");
    }
  }, [createComment, mentions, resetMentions, callbacks, user]);

  const handleCreateGif = useCallback(
    async (gif: {
      id: string;
      url: string;
      gifUrl: string;
      gifPreviewUrl: string;
      altText: string | undefined;
      aspectRatio: number;
    }) => {
      // Even though createComment checks for user and triggers the loginRequiredCallback - we will regard it as backup and check here too before clearing the textarea for better UX
      if (!user) {
        callbacks?.loginRequiredCallback?.();
        return;
      }
      const textArea = textAreaRef.current;
      if (!textArea) throw new Error("Can not find textarea");

      textArea.value = "";
      resetMentions();
      setIsGiphyVisible(false);

      try {
        await createComment!({ gif, mentions });
      } catch (err) {
        handleError(err, "Creating comment failed: ");
      }
    },
    [createComment, mentions, resetMentions, callbacks, user]
  );

  useEffect(() => {
    if (!pushMention) return;
    const textArea = textAreaRef.current;
    if (!textArea) throw new Error("Can't find textarea");

    // if (pushMention.id === previousPushMention?.id) return;

    if (!pushMention.username) {
      (
        callbacks?.userCantBeMentionedCallback ??
        (() => alert("User has no username"))
      )();
      return;
    }

    addMention(pushMention);

    textArea.value = `@${pushMention.username} ${textArea.value}`;
  }, [pushMention]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault(); // Prevent the default Enter behavior
        handleCreateComment();
      }
      // For Ctrl+Enter or Shift+Enter, do nothing and let the event propagate
    };

    const textArea = textAreaRef.current;
    textArea?.addEventListener("keydown", handleKeyDown);

    return () => {
      textArea?.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCreateComment]);

  const adjustTextareaHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto"; // Reset the height to 'auto' to get the correct scrollHeight
      const baseHeight = 20; // Example base height in pixels. Adjust this value to match your design.
      textArea.style.height = `${Math.max(
        baseHeight,
        Math.min(100, textArea.scrollHeight)
      )}px`; // Set the new height based on the content or use the base height if smaller
    }
  };

  // useEffect(() => {
  //   adjustTextareaHeight();
  // }, []);

  useLayoutEffect(() => {
    const timeout = setTimeout(() => adjustTextareaHeight(), 500);
    return () => clearTimeout(timeout); // Proper cleanup to clear the timeout
  }, []);

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
      <div
        style={{
          ...resetDiv,
          position: "relative",
          backgroundColor,
        }}
      >
        <div style={{ width: "100%", position: "relative" }}>
          <ReplyBanner />
          <MentionSuggestions
            isMentionActive={isMentionActive}
            isLoadingMentions={loading}
            mentionSuggestions={mentionSuggestions}
            handleMentionClick={handleMentionClick}
          />
        </div>
        <div style={{ position: "relative", zIndex: 20, backgroundColor }}>
          {withEmojis && (
            <EmojiSuggestions
              onEmojiClick={(emoji) => {
                const textArea = textAreaRef.current;
                if (!textArea) throw new Error("Can't find textarea");
                textArea.value += emoji;
                setContent((c) => c + emoji);
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",

              gap: itemsGap,
              paddingTop: verticalPadding,
              paddingBottom: verticalPadding,
              paddingLeft,
              paddingRight,
            }}
          >
            {user && withAvatar ? (
              <UserAvatar
                user={user}
                size={authorAvatarSize}
                borderRadius={authorAvatarSize}
              />
            ) : (
              <div style={{ height: authorAvatarSize, width: 2 }} />
            )}
            <textarea
              id="replyke-social-textarea"
              rows={1}
              ref={textAreaRef}
              placeholder={placeholderText}
              onChange={(e) => setContent(e.target.value)}
              required
              style={{
                ...resetTextInput,
                width: "100%",
                fontSize: textareaTextSize,
                color: textareaTextColor,
                backgroundColor: textareaBackgroundColor,
              }}
            />
            {content.length === 0 && giphyApiKey ? (
              <button
                type="button"
                onClick={() => setIsGiphyVisible(true)}
                disabled={submittingComment}
                style={{
                  ...resetButton,
                  border: "none",
                  outline: "none",
                  fontWeight: postButtonFontWeight,
                  fontSize: postButtonFontSize,
                  color: postButtonFontColor,
                  cursor: "pointer",
                }}
              >
                GIF
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateComment}
                disabled={submittingComment}
                style={{
                  ...resetButton,
                  border: "none",
                  outline: "none",
                  fontWeight: postButtonFontWeight,
                  fontSize: postButtonFontSize,
                  color: postButtonFontColor,
                  cursor: "pointer",
                }}
              >
                {postButtonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NewCommentForm;
