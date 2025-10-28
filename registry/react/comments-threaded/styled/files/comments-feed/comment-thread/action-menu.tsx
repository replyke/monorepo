import { useUser, Comment as CommentType } from "@replyke/react-js";
import useModalManager from "../../../hooks/use-modal-manager";

interface ActionMenuProps {
  comment: CommentType;
}

function ActionMenu({ comment }: ActionMenuProps) {
  const { user } = useUser();

  const { openCommentOptionsModal, openCommentOptionsModalOwner } =
    useModalManager();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() =>
          user && user.id === comment.userId
            ? openCommentOptionsModalOwner?.(comment)
            : openCommentOptionsModal?.(comment)
        }
        style={{
          padding: "2px",
          color: "#9CA3AF",
          transition: "colors 150ms ease-in-out",
          borderRadius: "4px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#4B5563";
          e.currentTarget.style.backgroundColor = "#F3F4F6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#9CA3AF";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        title="More options"
      >
        <svg
          style={{ width: "12px", height: "12px" }}
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
