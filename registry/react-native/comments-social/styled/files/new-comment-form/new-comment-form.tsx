import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
  TextInputKeyPressEventData,
  NativeSyntheticEvent,
} from "react-native";
import {
  handleError,
  useUser,
  useCommentSection,
  useMentions,
  useProject,
} from "@replyke/core";
import {
  resetButton,
  resetTextInput,
  resetView,
  UserAvatar,
  useTextInputCursorIndicator,
  EmojiSuggestions,
  GiphyContainer,
} from "@replyke/ui-core-react-native";

import ReplyBanner from "../reply-banner/reply-banner";
import MentionSuggestions from "../mention-suggestions/mention-suggestions";
import useUIState from "../../hooks/use-ui-state";

function NewCommentForm({
  ref,
}: {
  ref?: React.Ref<{ focus: () => void }>;
}) {
  const { user } = useUser();
  const { project } = useProject();
  const { theme } = useUIState();

  const giphyApiKey = project?.integrations.find((int) => int.name === "giphy")
    ?.data.apiKey;

  const { pushMention, createComment, submittingComment, callbacks } =
    useCommentSection();

  const [isGiphyVisible, setIsGiphyVisible] = useState(false);

  // 🎨 CUSTOMIZATION: Form styling defaults
  const backgroundColor = theme === 'dark' ? '#1F2937' : '#fff';
  const withAvatar = true;
  const itemsGap = 8;
  const verticalPadding = 8;
  const paddingLeft = 8;
  const paddingRight = 16;
  const authorAvatarSize = 32;
  const placeholderText = "Add a comment...";
  const textareaTextSize = 14;
  const textareaTextColor = theme === 'dark' ? '#E5E7EB' : '#000';
  const textareaBackgroundColor = theme === 'dark' ? '#1F2937' : '#fff';
  const postButtonText = "Post";
  const postButtonFontSize = 14;
  const postButtonFontColor = theme === 'dark' ? '#60A5FA' : '#0A99F6';
  const postButtonFontWeight = '600' as const;

  const textAreaRef = useRef<TextInput>(null);
  const [content, setContent] = useState("");

  const {
    cursorPosition,
    isSelectionActive,
    handleSelectionChange,
    handleTextChange,
  } = useTextInputCursorIndicator();

  const {
    isMentionActive,
    loading,
    mentionSuggestions,
    handleMentionClick,
    mentions,
    addMention,
    resetMentions,
  } = useMentions({
    content,
    setContent,
    focus: () => textAreaRef.current?.focus(),
    cursorPosition,
    isSelectionActive,
  });

  const handleCreateComment = useCallback(async () => {
    const tempContent = content;

    try {
      setContent("");
      Keyboard.dismiss(); // Dismiss the keyboard
      await createComment!({ content, mentions });
      resetMentions();
    } catch (err) {
      setContent(tempContent);
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
      setContent("");
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

    if (!pushMention.username) {

        callbacks?.userCantBeMentionedCallback?.();
      return;
    }

    addMention(pushMention);

    setContent((prevContent) => `@${pushMention.username} ${prevContent}`);
  }, [pushMention]);

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key === "Enter") {
        handleCreateComment();
      }
    },
    [handleCreateComment]
  );

  const adjustTextareaHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.measure((fx, fy, width, height, px, py) => {
        const baseHeight = 20;
        const newHeight = Math.max(baseHeight, Math.min(100, height));
        textArea.setNativeProps({
          style: { height: newHeight },
        });
      });
    }
  };

  useLayoutEffect(() => {
    const timeout = setTimeout(() => adjustTextareaHeight(), 500);
    return () => clearTimeout(timeout);
  }, []);

  // Expose the focus method to the parent through the forwarded ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textAreaRef.current?.focus();
    },
  }));

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
      <View
        style={{
          ...resetView,
          position: "relative",
          overflow: "visible",
          backgroundColor,
        }}
      >
        <View
          style={{ width: "100%", position: "relative", overflow: "visible" }}
        >
          <ReplyBanner />
          <MentionSuggestions
            isMentionActive={isMentionActive}
            isLoadingMentions={loading}
            mentionSuggestions={mentionSuggestions}
            handleMentionClick={handleMentionClick}
          />
        </View>
        <View
          style={{
            ...resetView,
            position: "relative",
            zIndex: 20,
            backgroundColor,
          }}
        >
          <EmojiSuggestions
            onEmojiClick={(emoji) => {
              setContent((c) => c + emoji);
            }}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: itemsGap,
              paddingTop: verticalPadding,
              paddingBottom: verticalPadding,
              paddingLeft,
              paddingRight,
              borderTopColor: theme === 'dark' ? "#4B5563" : "#e7e7e7",
              borderTopWidth: 1,
            }}
          >
            {user && withAvatar && (
              <UserAvatar
                user={user}
                size={authorAvatarSize}
                borderRadius={authorAvatarSize}
              />
            )}
            <TextInput
              ref={textAreaRef}
              numberOfLines={1}
              placeholder={placeholderText}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                handleTextChange(text);
              }}
              onSelectionChange={handleSelectionChange}
              onKeyPress={handleKeyPress}
              onSubmitEditing={() => handleCreateComment()}
              blurOnSubmit={false}
              style={{
                ...resetTextInput,
                flex: 1,
                marginHorizontal: 8,
                fontSize: textareaTextSize,
                backgroundColor: textareaBackgroundColor,
                color: textareaTextColor,
              }}
            />

            {content.length === 0 && giphyApiKey ? (
              <TouchableOpacity
                onPress={() => setIsGiphyVisible(true)}
                disabled={submittingComment}
                style={{ ...resetButton }}
              >
                <Text
                  style={{
                    fontWeight: postButtonFontWeight,
                    fontSize: postButtonFontSize,
                    color: postButtonFontColor,
                  }}
                >
                  GIF
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateComment}
                disabled={submittingComment}
                style={{ ...resetButton }}
              >
                <Text
                  style={{
                    fontWeight: postButtonFontWeight,
                    fontSize: postButtonFontSize,
                    color: postButtonFontColor,
                  }}
                >
                  {postButtonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

NewCommentForm.displayName = "NewCommentForm";

export default NewCommentForm;
