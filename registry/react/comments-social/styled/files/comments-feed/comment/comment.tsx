import React, { useState } from "react";
import {
  Comment as CommentType,
  useCommentVotes,
  getUserName,
  useUser,
  useCommentSection,
  handleError,
} from "@replyke/react-js";

import {
  UserAvatar,
  FromNow,
  resetButton,
  resetDiv,
  resetP,
  EllipsisIcon,
  parseContentWithMentions,
} from "@replyke/ui-core-react-js";

import Replies from "./replies";
import HeartButton from "./heart-button";
import useUIState from "../../../hooks/use-ui-state";

const Comment = React.memo(
  ({
    comment: commentFromSection,
    extraLeftPadding = 0,
  }: {
    comment: CommentType;
    extraLeftPadding?: number;
  }) => {
    const { user } = useUser();
    const {
      openCommentMenuModal,
      openCommentMenuModalOwner
    } = useUIState();
    const {
      handleShallowReply,
      handleDeepReply,
      callbacks,
      highlightedComment,
    } = useCommentSection();
    const { theme } = useUIState();

    const [hovered, setHovered] = useState(false); // State to track hover

    const [comment, setComment] = useState(commentFromSection);
    const { upvoteComment, removeCommentUpvote } = useCommentVotes({
      comment,
      setComment,
    });

    const handleUpvoteComment = () => {
      if (!user) {
        (
          callbacks?.loginRequiredCallback ||
          (() => alert("Please login first."))
        )();
        return;
      }

      if (!user.username && callbacks?.usernameRequiredCallback) {
        callbacks.usernameRequiredCallback();
        return;
      }

      try {
        upvoteComment();
      } catch (err) {
        handleError(err, "Failed to upvote comment");
      }
    };

    const handleRemoveCommentUpvote = () => {
      if (!user) {
        (
          callbacks?.loginRequiredCallback ||
          (() => alert("Please login first."))
        )();
        return;
      }

      try {
        removeCommentUpvote();
      } catch (err) {
        handleError(err, "Failed to upvote comment");
      }
    };

    const userUpvotedComment = !!(user && comment.upvotes.includes(user.id));

    return (
      <div
        style={{
          width: "100%",
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor:
            highlightedComment?.comment.id === comment.id
              ? (theme === 'dark' ? "#1E40AF" : "#dbeafe")
              : "transparent",
        }}
      >
        <div
          style={{
            paddingRight: 16,
            paddingLeft: 16 + extraLeftPadding,
          }}
          onMouseEnter={() => setHovered(true)} // Set hovered true
          onMouseLeave={() => setHovered(false)} // Set hovered false
        >
          <div
            style={{
              // 🎨 CUSTOMIZATION: Comment spacing (Default: 12px horizontal, 8px vertical)
              gap: 12,
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
            }}
          >
            <div
              onClick={() => {
                if (comment.user.id === user?.id) {
                  callbacks?.currentUserClickCallback?.();
                } else {
                  callbacks?.otherUserClickCallback?.(
                    comment.user.id,
                    comment.user.foreignId
                  );
                }
              }}
            >
              {/* 🎨 CUSTOMIZATION: Avatar size (Default: 32px) */}
              <UserAvatar
                user={comment.user}
                borderRadius={32}
                size={32}
              />
            </div>
            <div
              style={{
                gap: 8,
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <div
                  onClick={() => {
                    if (comment.user.id === user?.id) {
                      callbacks?.currentUserClickCallback?.();
                    } else {
                      callbacks?.otherUserClickCallback?.(
                        comment.user.id,
                        comment.user.foreignId
                      );
                    }
                  }}
                  style={{
                    ...resetP,
                    // 🎨 CUSTOMIZATION: Author name typography
                    fontWeight: 700,
                    fontSize: 13,
                    color: theme === 'dark' ? '#F9FAFB' : '#000',
                  }}
                >
                  {getUserName(comment.user, "username")}
                </div>
                {/* 🎨 CUSTOMIZATION: Timestamp typography */}
                <FromNow
                  time={comment.createdAt}
                  fontSize={12}
                  color={theme === 'dark' ? '#9CA3AF' : '#737373'}
                  justNowText="Just now"
                />
              </div>

              {comment.content && (
                <p
                  style={{
                    ...resetP,
                    // 🎨 CUSTOMIZATION: Comment body typography
                    fontSize: 14,
                    color: theme === 'dark' ? '#E5E7EB' : '#000',
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

                    borderRadius: "0.25rem", // Applies rounded corners to the image itself
                    overflow: "hidden",
                    objectFit: "cover",
                  }}
                />
              )}

              <div
                style={{
                  ...resetDiv,
                  // 🎨 CUSTOMIZATION: Action button spacing and typography
                  gap: 8,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() =>
                    comment.parentId
                      ? handleShallowReply!(comment)
                      : handleDeepReply!(comment)
                  }
                  style={{
                    ...resetButton,
                    color: theme === 'dark' ? '#9CA3AF' : '#737373',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Reply
                </button>
                {hovered && ( // Conditionally render the EllipsisIcon button
                  <button
                    onClick={() =>
                      user && user.id === comment.userId
                        ? openCommentMenuModalOwner?.(comment)
                        : openCommentMenuModal?.(comment)
                    }
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    <EllipsisIcon />
                  </button>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* 🎨 CUSTOMIZATION: Heart icon styling */}
              <HeartButton
                userUpvoted={userUpvotedComment}
                handleUpvote={handleUpvoteComment}
                handleRemoveUpvote={handleRemoveCommentUpvote}
                iconSize={14}
                emptyColor={theme === 'dark' ? '#9CA3AF' : '#8E8E8E'}
                fullColor={theme === 'dark' ? '#F87171' : '#DC2626'}
                padding={4}
                paddingBottom={4}
              />
              <div
                style={{
                  // 🎨 CUSTOMIZATION: Likes count typography
                  fontSize: 12,
                  color: theme === 'dark' ? '#9CA3AF' : '#8E8E8E',
                  fontWeight: 400,
                }}
              >
                {comment.upvotes.length}
              </div>
            </div>
          </div>
        </div>
        {!comment.parentId && <Replies commentId={comment.id} />}
      </div>
    );
  }
);

export default Comment;
