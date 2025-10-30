import { useState } from "react";
import {
  Comment as CommentType,
  getUserName,
  useCommentSection,
  useUser,
} from "@replyke/react-js";
import {
  parseContentWithMentions,
  UserAvatar,
} from "@replyke/ui-core-react-js";
import VoteButtons from "./vote-buttons";
import ActionMenu from "../action-menu";
import NewReplyForm from "../new-reply-form";
import ToggleRepliesVisibilty from "./toggle-replies-visibility";
import IndentationThreadingLines from "./indentation-threading-lines";
import ReplyButtonAndInfo from "./reply-button-and-info";
import useUIState from "../../../../hooks/use-ui-state";

interface SingleCommentProps {
  comment: CommentType;
  depth: number;
  hasReplies: boolean;
  isCollapsed: boolean;
  replyCount: number;
  isLastReply?: boolean;
  onToggleCollapse: () => void;
}

function SingleComment({
  comment: commentFromSection,
  depth,
  hasReplies,
  isCollapsed,
  replyCount,
  isLastReply = false,
  onToggleCollapse,
}: SingleCommentProps) {
  const { user } = useUser();
  const { callbacks, highlightedComment } = useCommentSection();
  const { theme } = useUIState();
  const [comment, setComment] = useState(commentFromSection);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const maxDepth = 6; // Limit visual nesting depth
  const actualDepth = Math.min(depth, maxDepth);

  // Calculate progressive indentation using inline styles for reliability
  const indentationPx = actualDepth * 24; // 24px per level (same as ml-10 = 2.5rem = 40px)

  return (
    <div
      style={{
        position: "relative",
        // marginBottom: "8px",
        marginLeft: `${indentationPx}px`,
        backgroundColor:
          highlightedComment?.comment.id === comment.id
            ? (theme === 'dark' ? "#1E40AF" : "#dbeafe")
            : "transparent",
      }}
    >
      {/* Threading lines - positioned behind avatars, relative to indentation */}
      {actualDepth > 0 && (
        <IndentationThreadingLines isLastReply={isLastReply} />
      )}

      <div
        style={{
          // 🎨 CUSTOMIZATION: Spacing (Default: 8px)
          padding: "8px 0",
          borderRadius: "6px",
          transition: "colors 150ms ease-in-out",
        }}
      >
        <div style={{ display: "flex" }}>
          {/* Avatar positioned for threading line connection with top margin */}
          <div
            style={{
              flexShrink: 0,
              // 🎨 CUSTOMIZATION: Spacing (Default: 12px)
              marginRight: "12px",
              position: "relative",
              // 🎨 CUSTOMIZATION: Spacing (Default: 4px, derived from 8/2)
              marginTop: "4px",
            }}
          >
            <div
              style={{ position: "relative", zIndex: 10, cursor: "pointer" }}
              onClick={() => {
                if (user?.id === comment.user.id) {
                  callbacks?.currentUserClickCallback?.();
                } else {
                  callbacks?.otherUserClickCallback?.(comment.user.id, comment.user.foreignId);
                }
              }}
            >
              <UserAvatar
                user={comment.user}
                // 🎨 CUSTOMIZATION: Avatar styling (Default: 24px)
                borderRadius={24}
                size={24}
              />
            </div>
            {/* Vertical line extending down from this comment's avatar when it has replies */}
            {hasReplies && !isCollapsed && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "20px",
                  width: "1px",
                  // 🎨 CUSTOMIZATION: Threading lines (Default: gray-300)
                  backgroundColor: theme === 'dark' ? "#6B7280" : "#D1D5DB",
                  zIndex: 0,
                  height: "calc(100% + 10px)",
                }}
              ></div>
            )}
          </div>

          {/* Comment content area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                // 🎨 CUSTOMIZATION: Spacing (Default: 4px, derived from 8/2)
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  // 🎨 CUSTOMIZATION: Spacing (Default: 8px)
                  gap: "8px",
                  // 🎨 CUSTOMIZATION: Typography - Timestamp (Default: 12px)
                  fontSize: "12px",
                  // 🎨 CUSTOMIZATION: Typography - Timestamp (Default: gray-500)
                  color: theme === 'dark' ? "#9CA3AF" : "#6B7280",
                }}
              >
                <span
                  style={{
                    // 🎨 CUSTOMIZATION: Typography - Author (Default: medium)
                    fontWeight: 500,
                    // 🎨 CUSTOMIZATION: Typography - Author (Default: 12px)
                    fontSize: "12px",
                    // 🎨 CUSTOMIZATION: Typography - Author (Default: gray-700)
                    color: theme === 'dark' ? "#D1D5DB" : "#374151",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (user?.id === comment.user.id) {
                      callbacks?.currentUserClickCallback?.();
                    } else {
                      callbacks?.otherUserClickCallback?.(comment.user.id, comment.user.foreignId);
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  {getUserName(comment.user)}
                </span>
                <span style={{ color: theme === 'dark' ? "#9CA3AF" : "#6B7280" }}>•</span>
                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                {isCollapsed && hasReplies && (
                  <span style={{ color: theme === 'dark' ? "#60A5FA" : "#3B82F6", fontSize: "12px" }}>
                    ({replyCount} {replyCount === 1 ? "reply" : "replies"})
                  </span>
                )}
                {hasReplies && (
                  <ToggleRepliesVisibilty
                    isCollapsed={isCollapsed}
                    onToggleCollapse={onToggleCollapse}
                  />
                )}
              </div>
              <ActionMenu comment={comment} />
            </div>

            {!isCollapsed && (
              <>
                {comment.content && (
                  <p
                    style={{
                      // 🎨 CUSTOMIZATION: Typography - Comment body (Default: 12px)
                      fontSize: "12px",
                      // 🎨 CUSTOMIZATION: Typography - Comment body (Default: gray-800)
                      color: theme === 'dark' ? "#E5E7EB" : "#1F2937",
                      // 🎨 CUSTOMIZATION: Spacing (Default: 12px)
                      marginBottom: "12px",
                      lineHeight: "1.625",
                    }}
                  >
                    {parseContentWithMentions(
                      comment.content,
                      comment.mentions,
                      user?.id,
                      callbacks?.currentUserClickCallback,
                      callbacks?.otherUserClickCallback
                    )}
                  </p>
                )}

                {comment.gif && (
                  <img
                    src={comment.gif.gifUrl}
                    alt={comment.gif.altText}
                    style={{
                      width:
                        comment.gif.aspectRatio > 1
                          ? 200
                          : 200 * comment.gif.aspectRatio,
                      height:
                        comment.gif.aspectRatio < 1
                          ? 200
                          : 200 / comment.gif.aspectRatio,
                      borderRadius: "0.25rem",
                      overflow: "hidden",
                      objectFit: "cover",
                      // 🎨 CUSTOMIZATION: Spacing (Default: 12px)
                      marginBottom: "12px",
                    }}
                  />
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <ReplyButtonAndInfo
                    hasReplies={hasReplies}
                    replyCount={replyCount}
                    setShowReplyForm={setShowReplyForm}
                  />
                  {/* Vote buttons inline with reply options */}
                  <div style={{ flexShrink: 0 }}>
                    <VoteButtons
                      comment={comment}
                      setComment={setComment}
                      size="small"
                    />
                  </div>
                </div>

                {/* Reply form */}
                {showReplyForm && (
                  <NewReplyForm
                    comment={comment}
                    setShowReplyForm={setShowReplyForm}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SingleComment;
