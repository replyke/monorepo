"use client";

import React, { useState } from "react";
import {
  Comment as CommentType,
  useCommentVotes,
  getUserName,
  useUser,
  useCommentSection,
  handleError,
} from "@replyke/core";
import { useSocialStyleConfig } from "@replyke/comments-social-core";

import {
  UserAvatar,
  FromNow,
  resetButton,
  resetDiv,
  resetP,
  EllipsisIcon,
  parseContentWithMentions,
} from "@replyke/ui-core-react-js";

import { Replies } from "./Replies";
import HeartButton from "./HeartButton";
import useModalManager from "../../../hooks/useModalManager";

const Comment = React.memo(
  ({
    comment: commentFromSection,
    extraLeftPadding = 0,
  }: {
    comment: CommentType;
    extraLeftPadding?: number;
  }) => {
    const { user } = useUser();
    const { openCommentOptionsModal, openCommentOptionsModalOwner } =
      useModalManager();
    const {
      handleShallowReply,
      handleDeepReply,
      callbacks,
      highlightedComment,
    } = useCommentSection();
    const { styleConfig } = useSocialStyleConfig();

    const {
      horizonalItemsGap,
      verticalItemsGap,
      authorAvatarSize,
      authorFontSize,
      authorFontWeight,
      authorFontColor,
      fromNowFontSize,
      fromNowFontColor,
      commentBodyFontSize,
      commentBodyFontColor,
      actionsItemGap,
      replyButtonFontSize,
      replyButtonFontWeight,
      replyButtonFontColor,
      heartIconSize,
      heartIconEmptyColor,
      heartIconFullColor,
      heartIconPaddingBottom,
      likesCountFontSize,
      likesCountFontWeight,
      likesCountFontColor,
      justNowText,
    } = styleConfig!.commentProps;

    const [hovered, setHovered] = useState(false); // State to track hover

    const [comment, setComment] = useState(commentFromSection);
    const { upvoteComment, removeCommentUpvote } = useCommentVotes({
      comment,
      setComment,
    });

    const handleUpvoteComment = () => {
      if (!user) {
        callbacks?.loginRequiredCallback ||
          (() => alert("Please login first."))();
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
        callbacks?.loginRequiredCallback ||
          (() => alert("Please login first."))();
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
              ? "#dbeafe"
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
              gap: horizonalItemsGap,
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
                  callbacks?.otherUserClickCallback?.(comment.user.id);
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
                      callbacks?.otherUserClickCallback?.(comment.user.id);
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
                        ? openCommentOptionsModalOwner?.(comment)
                        : openCommentOptionsModal?.(comment)
                    }
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
