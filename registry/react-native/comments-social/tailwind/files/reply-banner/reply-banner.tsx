import { View, Text, TouchableOpacity } from "react-native";
import { useCommentSection, getUserName } from "@replyke/core";
import useUIState from "../../hooks/use-ui-state";

const ReplyBanner = () => {
  const {
    repliedToComment,
    showReplyBanner,
    setShowReplyBanner,
    pushMention,
    setRepliedToComment,
  } = useCommentSection();
  const { theme } = useUIState();

  let repliedToUser = "";
  if (pushMention) {
    repliedToUser = getUserName(pushMention);
  } else if (repliedToComment?.user) {
    repliedToUser = getUserName(repliedToComment.user);
  }

  if (!showReplyBanner) return null;
  return (
    <View
      className={`absolute left-0 right-0 bottom-0 z-10 overflow-hidden p-3 h-auto ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-xs ${
            theme === 'dark' ? 'text-gray-400' : 'text-neutral-500'
          }`}
        >
          Replying to {repliedToUser}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setRepliedToComment?.(null);
            setShowReplyBanner?.(false);
          }}
        >
          <Text
            className={`text-base ${
              theme === 'dark' ? 'text-gray-50' : 'text-black'
            }`}
          >
            &times;
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReplyBanner;
