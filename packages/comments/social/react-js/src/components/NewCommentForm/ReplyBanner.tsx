import { useCommentSection, getUserName } from "@replyke/react-js";
import { resetButton } from "@replyke/ui-core-react-js";

function ReplyBanner() {
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
        backgroundColor: "#e7e7e7",
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
        <span style={{ color: "#787878", fontSize: 12 }}>
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

      {/* {repliedToComment && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
          }}
        >
          <span style={{ color: "#787878",fontSize: 12, }}>
            Replying to {repliedToComment?.author.name}
          </span>
          <button
            onClick={() => setRepliedToComment!(null)}
            style={{ ...resetButton, fontSize: 16 }}
          >
            &times;
          </button>
        </div>
      )} */}
    </div>
  );
}

export default ReplyBanner;
