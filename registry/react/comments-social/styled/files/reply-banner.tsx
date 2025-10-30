import { useCommentSection, getUserName } from "@replyke/react-js";
import { resetButton } from "@replyke/ui-core-react-js";
import useUIState from "../hooks/use-ui-state";

function ReplyBanner() {
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

  return (
    <div
      style={{
        height: "auto",
        position: "absolute",
        bottom: showReplyBanner ? 0 : -60,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: "hidden",
        transition: "height 0.3s ease, top 0.3s ease",
        // 🎨 CUSTOMIZATION: Reply banner background (Default: light gray)
        backgroundColor: theme === 'dark' ? '#374151' : '#e7e7e7',
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        <span style={{
          // 🎨 CUSTOMIZATION: Reply banner text color
          color: theme === 'dark' ? '#9CA3AF' : '#787878',
          fontSize: 12
        }}>
          Replying to {repliedToUser}
        </span>
        <button
          onClick={() => {
            setRepliedToComment!(null);
            setShowReplyBanner!(false);
          }}
          style={{ ...resetButton, fontSize: 16 }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default ReplyBanner;
