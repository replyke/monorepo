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

import { cn } from "@/lib/utils";
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

    const [hovered, setHovered] = useState(false); // State to track hover

    const [comment, setComment] = useState(commentFromSection);
    const { upvoteComment, removeCommentUpvote } = useCommentVotes({
      comment,
      setComment,
    });

    const handleUpvoteComment = () => {
      if (!user) {
        
          callbacks?.loginRequiredCallback?.();
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
        
          callbacks?.loginRequiredCallback?.();
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
        className={cn(
          "w-full py-2",
          highlightedComment?.comment.id === comment.id &&
          "bg-blue-100 dark:bg-blue-900"
        )}
      >
        <div
          className="pr-4"
          style={{
            paddingLeft: 16 + extraLeftPadding,
          }}
          onMouseEnter={() => setHovered(true)} // Set hovered true
          onMouseLeave={() => setHovered(false)} // Set hovered false
        >
          <div
            className="flex flex-row items-start gap-3"
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
              className="flex-1 flex flex-col gap-2"
            >
              <div
                className="flex flex-row items-baseline gap-1 mt-0.5"
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
                  style={resetP}
                  className="font-bold text-[13px] text-gray-900 dark:text-gray-50"
                >
                  {getUserName(comment.user, "username")}
                </div>
                {/* 🎨 CUSTOMIZATION: Timestamp typography */}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  <FromNow
                    time={comment.createdAt}
                    fontSize={12}
                    color="inherit"
                    justNowText="Just now"
                  />
                </span>
              </div>

              {comment.content && (
                <p
                  style={resetP}
                  className="text-sm text-gray-900 dark:text-gray-200"
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
                  className="rounded overflow-hidden object-cover"
                  style={{
                    width:
                      comment.gif.aspectRatio > 1
                        ? 200
                        : 200 * comment.gif.aspectRatio,
                    height:
                      comment.gif.aspectRatio < 1
                        ? 200
                        : 200 / comment.gif.aspectRatio,
                  }}
                />
              )}

              <div
                style={resetDiv}
                className="flex flex-row items-center gap-2"
              >
                <button
                  onClick={() =>
                    comment.parentId
                      ? handleShallowReply!(comment)
                      : handleDeepReply!(comment)
                  }
                  style={resetButton}
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400"
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
                    className="cursor-pointer"
                  >
                    <EllipsisIcon />
                  </button>
                )}
              </div>
            </div>
            <div
              className="flex flex-col items-center"
            >
              {/* 🎨 CUSTOMIZATION: Heart icon styling */}
              <HeartButton
                userUpvoted={userUpvotedComment}
                handleUpvote={handleUpvoteComment}
                handleRemoveUpvote={handleRemoveCommentUpvote}
                iconSize={14}
                emptyColor="rgb(156 163 175)" // gray-400
                fullColor="rgb(220 38 38)" // red-600 (light mode fallback)
                padding={4}
                paddingBottom={4}
              />
              <div
                className="text-xs text-gray-500 dark:text-gray-400 font-normal"
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
