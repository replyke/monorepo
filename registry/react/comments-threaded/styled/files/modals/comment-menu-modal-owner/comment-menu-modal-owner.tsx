import { useCommentSection } from "@replyke/react-js";
import {
  Modal,
  resetButton,
  resetDiv,
  resetUl,
} from "@replyke/ui-core-react-js";
import useModalManager from "../../../hooks/use-modal-manager";

function CommentMenuModalOwner() {
  const {
    optionsComment,
    isCommentOptionsModalOwnerOpen,
    closeCommentOptionsModalOwner,
    theme,
  } = useModalManager();

  const { deleteComment } = useCommentSection();

  const handleDeleteComment = async () => {
    const userConfirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );
    if (userConfirmed && optionsComment) {
      closeCommentOptionsModalOwner?.();
      await deleteComment?.({ commentId: optionsComment.id });
    } else {
      closeCommentOptionsModalOwner?.();
    }
  };

  return (
    <Modal
      show={!!isCommentOptionsModalOwnerOpen}
      onClose={closeCommentOptionsModalOwner}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...resetDiv,
          backgroundColor: theme === 'dark' ? "#1F2937" : "white",
          borderRadius: 8,
          width: "100%",
          maxWidth: 240,
          alignSelf: "center",
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <ul
          style={{
            ...resetUl,
            width: "100%",
          }}
        >
          <li
            style={{
              display: "flex",
              justifyContent: "center",
              justifySelf: "center",
            }}
          >
            <button
              style={{
                ...resetButton,
                fontWeight: 600,
                color: theme === 'dark' ? "#EF4444" : "#DC2626",
                paddingLeft: 24,
                paddingRight: 24,
                paddingTop: 8,
                paddingBottom: 8,
              }}
              onClick={handleDeleteComment}
            >
              Remove
            </button>
          </li>
          <div
            style={{ height: 1, width: "100%", backgroundColor: theme === 'dark' ? "#4B5563" : "#e7e7e7" }}
          />
          <li
            style={{
              display: "flex",
              justifyContent: "center",
              justifySelf: "center",
            }}
          >
            <button
              style={{
                ...resetButton,
                color: theme === 'dark' ? "#D1D5DB" : "#374151", // 🎨 CUSTOMIZATION: Cancel button text color
                paddingLeft: 24,
                paddingRight: 24,
                paddingTop: 8,
                paddingBottom: 8,
              }}
              onClick={closeCommentOptionsModalOwner}
            >
              Cancel
            </button>
          </li>
        </ul>
      </div>
    </Modal>
  );
}

export default CommentMenuModalOwner;
