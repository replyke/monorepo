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
  ActivityIndicator,
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
  GiphyContainer,
} from "@replyke/ui-core-react-native";

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

  const { createComment, submittingComment, callbacks } = useCommentSection();

  const [isGiphyVisible, setIsGiphyVisible] = useState(false);

  const textAreaRef = useRef<TextInput>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const hasContent = content.trim().length > 0;

  const handleCreateComment = useCallback(async () => {
    if (isSubmitting) return;

    if (!hasContent) {
      callbacks?.commentTooShortCallback?.();
      return;
    }

    if (!user) {
      callbacks?.loginRequiredCallback?.();
      return;
    }

    if (!user.username && callbacks?.usernameRequiredCallback) {
      callbacks.usernameRequiredCallback();
      return;
    }

    const tempContent = content.trim();
    setIsSubmitting(true);

    try {
      Keyboard.dismiss();
      await createComment!({ content: tempContent, mentions });
      setContent("");
      resetMentions();
    } catch (err) {
      handleError(err, "Creating comment failed: ");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    hasContent,
    isSubmitting,
    user,
    createComment,
    mentions,
    resetMentions,
    callbacks,
    content,
  ]);

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

  const handleKeyPress = useCallback(
    (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (event.nativeEvent.key === "Enter") {
        handleCreateComment();
      }
    },
    [handleCreateComment]
  );

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
          <View
            className={`flex-row items-end p-2 mx-2 mb-2 rounded-2xl ${
              hasContent
                ? theme === 'dark'
                  ? 'border border-blue-800'
                  : 'border border-blue-300'
                : theme === 'dark'
                  ? 'border border-gray-600'
                  : 'border border-gray-200'
            }`}
          >
            <TextInput
              ref={textAreaRef}
              multiline
              numberOfLines={2}
              placeholder="Add your reply..."
              value={content}
              onChangeText={(text) => {
                setContent(text);
                handleTextChange(text);
              }}
              onSelectionChange={handleSelectionChange}
              onKeyPress={handleKeyPress}
              blurOnSubmit={false}
              className={`flex-1 p-2 text-xs bg-transparent ${
                theme === 'dark' ? 'text-gray-50' : 'text-gray-900'
              }`}
              placeholderTextColor={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
              style={{ textAlignVertical: 'top' }}
            />
            {!hasContent && giphyApiKey ? (
              <TouchableOpacity
                onPress={() => setIsGiphyVisible(true)}
                disabled={isSubmitting}
                className="p-2"
              >
                <Text
                  className={`text-xs font-normal ${
                    theme === 'dark' ? 'text-gray-50' : 'text-gray-50'
                  }`}
                >
                  GIF
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateComment}
                disabled={!hasContent || isSubmitting}
                className={`p-2 rounded-full ${
                  hasContent && !isSubmitting
                    ? theme === 'dark'
                      ? 'bg-blue-500'
                      : 'bg-blue-600'
                    : theme === 'dark'
                      ? 'bg-gray-600'
                      : 'bg-gray-200'
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator
                    size="small"
                    color={theme === 'dark' ? '#F9FAFB' : '#FFFFFF'}
                    style={{ width: 12, height: 12 }}
                  />
                ) : (
                  <View
                    style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text
                      className={`text-xs ${
                        hasContent
                          ? 'text-white'
                          : theme === 'dark'
                            ? 'text-gray-500'
                            : 'text-gray-400'
                      }`}
                    >
                      ↑
                    </Text>
                  </View>
                )}
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
