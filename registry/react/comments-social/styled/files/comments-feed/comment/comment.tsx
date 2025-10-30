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

import { Replies } from "./replies/replies";
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

    // 🎨 CUSTOMIZATION: Comment spacing (Default: 12px horizontal, 8px vertical)
    const horizontalItemsGap = 12;
    const verticalItemsGap = 8;

    // 🎨 CUSTOMIZATION: Avatar size (Default: 32px)
    const authorAvatarSize = 32;

    // 🎨 CUSTOMIZATION: Author name typography
    const authorFontSize = 13;
    const authorFontWeight = 700;
    const authorFontColor = theme === 'dark' ? '#F9FAFB' : '#000';

    // 🎨 CUSTOMIZATION: Timestamp typography
    const fromNowFontSize = 12;
    const fromNowFontColor = theme === 'dark' ? '#9CA3AF' : '#737373';

    // 🎨 CUSTOMIZATION: Comment body typography
    const commentBodyFontSize = 14;
    const commentBodyFontColor = theme === 'dark' ? '#E5E7EB' : '#000';

    // 🎨 CUSTOMIZATION: Action button spacing and typography
    const actionsItemGap = 8;
    const replyButtonFontSize = 12;
    const replyButtonFontWeight = 600;
    const replyButtonFontColor = theme === 'dark' ? '#9CA3AF' : '#737373';

    // 🎨 CUSTOMIZATION: Heart icon styling
    const heartIconSize = 14;
    const heartIconFullColor = theme === 'dark' ? '#F87171' : '#DC2626';
    const heartIconEmptyColor = theme === 'dark' ? '#9CA3AF' : '#8E8E8E';
    const heartIconPaddingBottom = 4;

    // 🎨 CUSTOMIZATION: Likes count typography
    const likesCountFontSize = 12;
    const likesCountFontWeight = 400;
    const likesCountFontColor = theme === 'dark' ? '#9CA3AF' : '#8E8E8E';

    // 🎨 CUSTOMIZATION: Text labels
    const justNowText = "Just now";

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
              gap: horizontalItemsGap,
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
              <UserAvatar
                user={comment.user}
                borderRadius={authorAvatarSize}
                size={authorAvatarSize}
              />
            </div>
            <div
              style={{
                gap: verticalItemsGap,
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
                    fontWeight: authorFontWeight,
                    fontSize: authorFontSize,
                    color: authorFontColor,
                  }}
                >
                  {getUserName(comment.user, "username")}
                </div>
                <FromNow
                  time={comment.createdAt}
                  fontSize={fromNowFontSize}
                  color={fromNowFontColor}
                  justNowText={justNowText}
                />
              </div>

              {comment.content && (
                <p
                  style={{
                    ...resetP,
                    fontSize: commentBodyFontSize,
                    color: commentBodyFontColor,
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
                  gap: actionsItemGap,
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
                    color: replyButtonFontColor,
                    fontSize: replyButtonFontSize,
                    fontWeight: replyButtonFontWeight,
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
              <HeartButton
                userUpvoted={userUpvotedComment}
                handleUpvote={handleUpvoteComment}
                handleRemoveUpvote={handleRemoveCommentUpvote}
                iconSize={heartIconSize}
                emptyColor={heartIconEmptyColor}
                fullColor={heartIconFullColor}
                padding={4}
                paddingBottom={heartIconPaddingBottom}
              />
              <div
                style={{
                  fontSize: likesCountFontSize,
                  color: likesCountFontColor,
                  fontWeight: likesCountFontWeight,
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
