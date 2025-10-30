import { useCommentSection } from "@replyke/react-js";
import {
  Modal,
  resetButton,
  resetDiv,
  resetUl,
} from "@replyke/ui-core-react-js";
import useUIState from "../../../hooks/use-ui-state";

function CommentMenuModalOwner() {
  const {
    optionsComment,
    isCommentMenuModalOwnerOpen,
    closeCommentMenuModalOwner,
    theme
  } = useUIState();

  const { deleteComment } = useCommentSection();

  const handleDeleteComment = async () => {
    const userConfirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );
    if (userConfirmed && optionsComment) {
      closeCommentMenuModalOwner?.();
      await deleteComment?.({ commentId: optionsComment.id });
    } else {
      closeCommentMenuModalOwner?.();
    }
  };

  return (
    <Modal
      show={!!isCommentMenuModalOwnerOpen}
      onClose={closeCommentMenuModalOwner}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...resetDiv,
          // 🎨 CUSTOMIZATION: Modal background
          backgroundColor: theme === 'dark' ? '#1F2937' : 'white',
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
                // 🎨 CUSTOMIZATION: Delete button color (red for danger)
                color: theme === 'dark' ? '#F87171' : '#DC2626',
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
            style={{
              height: 1,
              width: "100%",
              // 🎨 CUSTOMIZATION: Divider color
              backgroundColor: theme === 'dark' ? '#4B5563' : '#e7e7e7'
            }}
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
                // 🎨 CUSTOMIZATION: Cancel button color
                color: theme === 'dark' ? '#F9FAFB' : '#000',
                paddingLeft: 24,
                paddingRight: 24,
                paddingTop: 8,
                paddingBottom: 8,
              }}
              onClick={closeCommentMenuModalOwner}
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
