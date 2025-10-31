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
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        overflow: "hidden",
        // 🎨 CUSTOMIZATION: Reply banner background
        backgroundColor: theme === 'dark' ? "#374151" : "#e7e7e7",
        padding: 12,
        height: "auto",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{
          // 🎨 CUSTOMIZATION: Reply banner text color
          color: theme === 'dark' ? "#9CA3AF" : "#787878",
          fontSize: 12
        }}>
          Replying to {repliedToUser}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setRepliedToComment?.(null);
            setShowReplyBanner?.(false);
          }}
        >
          <Text style={{
            fontSize: 16,
            // 🎨 CUSTOMIZATION: Close button color
            color: theme === 'dark' ? "#F9FAFB" : "#000"
          }}>&times;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReplyBanner;
