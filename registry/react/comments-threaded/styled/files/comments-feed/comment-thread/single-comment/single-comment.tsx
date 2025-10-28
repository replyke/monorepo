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
  const [comment, setComment] = useState(commentFromSection);
  const [showReplyForm, setShowReplyForm] = useState(false);

  // 🎨 CUSTOMIZATION: Avatar styling
  const authorAvatarSize = 24; // Default: 24px

  // 🎨 CUSTOMIZATION: Typography - Author
  const authorFontSize = 12; // Default: 12px
  const authorFontWeight = 500; // Default: medium
  const authorFontColor = "#374151"; // Default: gray-700

  // 🎨 CUSTOMIZATION: Typography - Timestamp
  const fromNowFontSize = 12; // Default: 12px
  const fromNowFontColor = "#6B7280"; // Default: gray-500

  // 🎨 CUSTOMIZATION: Typography - Comment body
  const commentBodyFontSize = 12; // Default: 12px
  const commentBodyFontColor = "#1F2937"; // Default: gray-800

  // 🎨 CUSTOMIZATION: Spacing
  const horizontalItemsGap = 12; // Default: 12px
  const verticalItemsGap = 8; // Default: 8px

  // 🎨 CUSTOMIZATION: Threading lines
  const threadingLineColor = "#D1D5DB"; // Default: gray-300

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
            ? "#dbeafe"
            : "transparent",
      }}
    >
      {/* Threading lines - positioned behind avatars, relative to indentation */}
      {actualDepth > 0 && (
        <IndentationThreadingLines isLastReply={isLastReply} />
      )}

      <div
        style={{
          padding: `${verticalItemsGap}px 0`,
          borderRadius: "6px",
          transition: "colors 150ms ease-in-out",
        }}
      >
        <div style={{ display: "flex" }}>
          {/* Avatar positioned for threading line connection with top margin */}
          <div
            style={{
              flexShrink: 0,
              marginRight: `${horizontalItemsGap}px`,
              position: "relative",
              marginTop: `${verticalItemsGap / 2}px`,
            }}
          >
            <div style={{ position: "relative", zIndex: 10 }}>
              <UserAvatar
                user={comment.user}
                borderRadius={authorAvatarSize}
                size={authorAvatarSize}
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
                  backgroundColor: threadingLineColor,
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
                marginBottom: `${verticalItemsGap / 2}px`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: `${verticalItemsGap}px`,
                  fontSize: `${fromNowFontSize}px`,
                  color: fromNowFontColor,
                }}
              >
                <span
                  style={{
                    fontWeight: authorFontWeight,
                    fontSize: authorFontSize,
                    color: authorFontColor,
                  }}
                >
                  {getUserName(comment.user)}
                </span>
                <span>•</span>
                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                {isCollapsed && hasReplies && (
                  <span className="text-blue-600 text-xs">
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
                      fontSize: `${commentBodyFontSize}px`,
                      color: commentBodyFontColor,
                      marginBottom: `${horizontalItemsGap}px`,
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
                      marginBottom: `${horizontalItemsGap}px`,
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
