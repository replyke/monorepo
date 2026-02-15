import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import {
  useCommentSection,
  useUser,
  Comment as CommentType,
} from "@replyke/core";
import useUIState from "../../../hooks/use-ui-state";

function NewReplyForm({
  comment,
  setShowReplyForm,
}: {
  comment: CommentType;
  setShowReplyForm: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { user } = useUser();
  const { theme } = useUIState();

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
      callbacks?.loginRequiredCallback?.();
      return;
    }

    if (!user.username && callbacks?.usernameRequiredCallback) {
      callbacks.usernameRequiredCallback();
      return;
    }

    setIsSubmitting(true);
    try {
      Keyboard.dismiss();
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

  const hasContent = replyContent.trim().length > 0;

  return (
    <View className="mt-2">
      <View
        className={`flex-row items-end p-1.5 rounded-2xl ${
          hasContent
            ? theme === 'dark'
              ? 'border border-blue-900'
              : 'border border-blue-300'
            : theme === 'dark'
              ? 'border border-gray-600'
              : 'border border-gray-200'
        } ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
      >
        <TextInput
          value={replyContent}
          onChangeText={setReplyContent}
          placeholder="Add your reply..."
          multiline
          numberOfLines={2}
          className={`flex-1 py-1.5 px-2 text-xs bg-transparent ${
            theme === 'dark' ? 'text-gray-50' : 'text-gray-900'
          }`}
          placeholderTextColor={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
          style={{ textAlignVertical: 'top' }}
        />
        <View className="flex-row gap-1 ml-1">
          <TouchableOpacity
            onPress={handleCancelReply}
            disabled={isSubmitting}
            className={`px-2 py-1 rounded ${
              theme === 'dark' ? 'active:bg-gray-700' : 'active:bg-gray-50'
            }`}
          >
            <Text
              className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReply}
            disabled={!hasContent || isSubmitting}
            className={`p-1.5 rounded-full ${
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
        </View>
      </View>
    </View>
  );
}

export default NewReplyForm;
