import { useCommentSection } from "@replyke/react-js";
import { Modal } from "@replyke/ui-core-react-js";
import useUIState from "../../../hooks/use-ui-state";

function CommentMenuModalOwner() {
  const {
    optionsComment,
    isCommentOptionsModalOwnerOpen,
    closeCommentOptionsModalOwner,
  } = useUIState();

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
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-[240px] self-center py-2"
      >
        <ul className="w-full list-none m-0 p-0">
          <li className="flex justify-center justify-self-center">
            <button
              className="font-semibold text-red-600 dark:text-red-500 px-6 py-2 bg-transparent border-none cursor-pointer"
              // 🎨 CUSTOMIZATION: Remove button styling
              onClick={handleDeleteComment}
            >
              Remove
            </button>
          </li>
          <div className="h-px w-full bg-gray-200 dark:bg-gray-600" />
          <li className="flex justify-center justify-self-center">
            <button
              className="text-gray-700 dark:text-gray-300 px-6 py-2 bg-transparent border-none cursor-pointer"
              // 🎨 CUSTOMIZATION: Cancel button styling
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
