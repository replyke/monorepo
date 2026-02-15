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

  // CUSTOMIZATION: Form styling defaults
  const withAvatar = true;
  const authorAvatarSize = 32;
  const placeholderText = "Add a comment...";

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
      Keyboard.dismiss();
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
        className={`relative overflow-visible ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <View className="w-full relative overflow-visible">
          <ReplyBanner />
          <MentionSuggestions
            isMentionActive={isMentionActive}
            isLoadingMentions={loading}
            mentionSuggestions={mentionSuggestions}
            handleMentionClick={handleMentionClick}
          />
        </View>
        <View
          className={`relative z-20 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <EmojiSuggestions
            onEmojiClick={(emoji) => {
              setContent((c) => c + emoji);
            }}
          />
          <View
            className={`flex-row items-center justify-end gap-2 py-2 pl-2 pr-4 border-t ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
            }`}
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
              className={`flex-1 mx-2 text-sm bg-transparent border-0 p-0 m-0 ${
                theme === 'dark' ? 'text-gray-200' : 'text-black'
              }`}
              placeholderTextColor={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
            />

            {content.length === 0 && giphyApiKey ? (
              <TouchableOpacity
                onPress={() => setIsGiphyVisible(true)}
                disabled={submittingComment}
                className="bg-transparent border-0 p-0 m-0"
              >
                <Text
                  className={`font-semibold text-sm ${
                    theme === 'dark' ? 'text-blue-400' : 'text-sky-500'
                  }`}
                >
                  GIF
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateComment}
                disabled={submittingComment}
                className="bg-transparent border-0 p-0 m-0"
              >
                <Text
                  className={`font-semibold text-sm ${
                    theme === 'dark' ? 'text-blue-400' : 'text-sky-500'
                  }`}
                >
                  Post
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
