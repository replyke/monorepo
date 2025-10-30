import { useUser, Comment as CommentType } from "@replyke/react-js";
import useUIState from "../../../hooks/use-ui-state";

interface ActionMenuProps {
  comment: CommentType;
}

function ActionMenu({ comment }: ActionMenuProps) {
  const { user } = useUser();
  const { openCommentOptionsModal, openCommentOptionsModalOwner } = useUIState();

  return (
    <div className="relative">
      <button
        onClick={() =>
          user && user.id === comment.userId
            ? openCommentOptionsModalOwner?.(comment)
            : openCommentOptionsModal?.(comment)
        }
        className="p-0.5 text-gray-400 dark:text-gray-500 transition-colors duration-150 rounded bg-transparent border-none cursor-pointer hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        title="More options"
      >
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
    </div>
  );
}

export default ActionMenu;
