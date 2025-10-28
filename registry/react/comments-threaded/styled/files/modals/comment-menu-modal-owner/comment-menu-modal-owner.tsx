import { useCommentSection } from "@replyke/react-js";
import {
  Modal,
  resetButton,
  resetDiv,
  resetUl,
} from "@replyke/ui-core-react-js";
import useModalManager from "../../../hooks/useModalManager";

function CommentMenuModalOwner() {
  const {
    optionsComment,
    isCommentOptionsModalOwnerOpen,
    closeCommentOptionsModalOwner,
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
          backgroundColor: "white",
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
                color: "#DC2626",
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
            style={{ height: 1, width: "100%", backgroundColor: "#e7e7e7" }}
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
