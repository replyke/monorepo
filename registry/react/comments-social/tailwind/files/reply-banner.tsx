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

  let repliedToUser = "";
  if (pushMention) {
    repliedToUser = getUserName(pushMention);
  } else if (repliedToComment?.user) {
    repliedToUser = getUserName(repliedToComment.user);
  }

  return (
    <div
      style={{
        bottom: showReplyBanner ? 0 : -60,
      }}
      className="h-auto absolute left-0 right-0 z-10 overflow-hidden transition-all duration-300 bg-gray-200 dark:bg-gray-700 px-3 py-2"
    >
      <div
        className="flex items-center justify-between h-full"
      >
        <span className="text-gray-600 dark:text-gray-400 text-xs">
          Replying to {repliedToUser}
        </span>
        <button
          onClick={() => {
            setRepliedToComment!(null);
            setShowReplyBanner!(false);
          }}
          style={resetButton}
          className="text-base"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export default ReplyBanner;
