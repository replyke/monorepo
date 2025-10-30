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
        style={resetDiv}
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-60 self-center py-2"
      >
        <ul
          style={resetUl}
          className="w-full"
        >
          <li
            className="flex justify-center justify-self-center"
          >
            <button
              style={resetButton}
              className="font-semibold text-red-600 dark:text-red-400 px-6 py-2"
              onClick={handleDeleteComment}
            >
              Remove
            </button>
          </li>
          <div
            className="h-px w-full bg-gray-200 dark:bg-gray-600"
          />
          <li
            className="flex justify-center justify-self-center"
          >
            <button
              style={resetButton}
              className="text-gray-900 dark:text-gray-50 px-6 py-2"
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
