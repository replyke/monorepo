import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import useUIState from "../../../../hooks/use-ui-state";

function ReplyButtonAndInfo({
  hasReplies,
  replyCount,
  setShowReplyForm,
}: {
  hasReplies: boolean;
  replyCount: number;
  setShowReplyForm: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { theme } = useUIState();

  return (
    <View className="flex-row items-center gap-4">
      <TouchableOpacity
        onPress={() => setShowReplyForm((prev) => !prev)}
        className={`px-2 py-1 -ml-2 rounded ${
          theme === 'dark' ? 'active:bg-blue-950' : 'active:bg-blue-50'
        }`}
      >
        <Text
          className={`text-xs font-medium ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Reply
        </Text>
      </TouchableOpacity>
      {hasReplies && (
        <Text
          className={`text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </Text>
      )}
    </View>
  );
}

export default ReplyButtonAndInfo;
