import {
  forwardRef,
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
  Alert,
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
import { useSocialStyleConfig } from "@replyke/comments-social-core";

import ReplyBanner from "./ReplyBanner";
import MentionSuggestions from "./MentionSuggestions";

const NewCommentForm = forwardRef<
  { focus: () => void },
  { withEmojis?: boolean }
>(({ withEmojis = true }, ref) => {
  const { user } = useUser();
  const { project } = useProject();

  const giphyApiKey = project?.integrations.find((int) => int.name === "giphy")
    ?.data.apiKey;

  const { pushMention, createComment, submittingComment, callbacks } =
    useCommentSection();
  const { styleConfig } = useSocialStyleConfig();

  const [isGiphyVisible, setIsGiphyVisible] = useState(false);

  const {
    backgroundColor,
    withAvatar,
    itemsGap,
    verticalPadding,
    paddingLeft,
    paddingRight,
    authorAvatarSize,
    placeholderText,
    textareaTextSize,
    postButtonText,
    postButtonFontSize,
    postButtonFontColor,
    postButtonFontWeight,
  } = styleConfig!.newCommentFormProps;

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
    if (!user) {
      callbacks?.loginRequiredCallback?.();
      return;
    }
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
      if (!user) {
        callbacks?.loginRequiredCallback?.();
        return;
      }

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

    // if (pushMention.id === previousPushMention?.id) return;

    if (!pushMention.username) {
      (
        callbacks?.userCantBeMentionedCallback ??
        (() => Alert.alert("User has no username"))
      )();
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
      // If you want Shift+Enter or Ctrl+Enter to create a new line, you can leave this as-is.
    },
    [handleCreateComment]
  );

  const adjustTextareaHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.measure((fx, fy, width, height, px, py) => {
        const baseHeight = 20; // Example base height in pixels. Adjust this value to match your design.
        const newHeight = Math.max(baseHeight, Math.min(100, height));
        textArea.setNativeProps({
          style: { height: newHeight },
        });
      });
    }
  };

  // useEffect(() => {
  //   adjustTextareaHeight();
  // }, [body]);

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
          {withEmojis && (
            <EmojiSuggestions
              onEmojiClick={(emoji) => {
                setContent((c) => c + emoji);
              }}
            />
          )}
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
              borderTopColor: "#e7e7e7",
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
});

export default NewCommentForm;
