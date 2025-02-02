import { View, Text, TouchableOpacity } from "react-native";
import { useCommentSection, getUserName } from "@replyke/core";

const ReplyBanner = () => {
  const {
    repliedToComment,
    showReplyBanner,
    setShowReplyBanner,
    pushMention,
    setRepliedToComment,
  } = useCommentSection();

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
        backgroundColor: "#e7e7e7",
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
        <Text style={{ color: "#787878", fontSize: 12 }}>
          Replying to {repliedToUser}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setRepliedToComment?.(null);
            setShowReplyBanner?.(false);
          }}
        >
          <Text style={{ fontSize: 16, color: "#000" }}>&times;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReplyBanner;
