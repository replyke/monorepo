import { useCallback, useState } from "react";
import { handleError } from "../../utils/handleError";
import { Comment } from "../../interfaces/models/Comment";
import useUser from "../users/useUser";

// Import the communication hooks
import useUpvoteComment from "./useUpvoteComment";
import useRemoveCommentUpvote from "./useRemoveCommentUpvote";
import useDownvoteComment from "./useDownvoteComment";
import useRemoveCommentDownvote from "./useRemoveCommentDownvote";

function useCommentVotes(props: {
  comment: Comment;
  setComment: React.Dispatch<React.SetStateAction<Comment>>;
}) {
  const { user } = useUser();
  const { comment, setComment } = props;

  // Save the previous state in case we need to revert
  const [previousComment, setPreviousComment] = useState<Comment>(comment);
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper to update state and remember the previous value
  const updateCommentState = (newCommentState: Comment) => {
    setPreviousComment(comment);
    setComment(newCommentState);
  };

  const revertToPreviousState = useCallback(() => {
    setComment(previousComment);
  }, [previousComment, setComment]);

  // Get our request functions from the extracted hooks
  const upvoteCommentRequest = useUpvoteComment();
  const removeUpvoteRequest = useRemoveCommentUpvote();
  const downvoteCommentRequest = useDownvoteComment();
  const removeDownvoteRequest = useRemoveCommentDownvote();

  const handleUpvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (isUpdating) return;

    // Optimistic update: add upvote and remove any downvote from the user
    updateCommentState({
      ...comment,
      upvotes: [...comment.upvotes, user.id],
      downvotes: comment.downvotes.filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedComment = await upvoteCommentRequest({
        commentId: comment.id,
      });
      setComment(updatedComment);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to update comment vote: ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveUpvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (isUpdating) return;

    // Optimistic update: remove the user's upvote
    updateCommentState({
      ...comment,
      upvotes: comment.upvotes.filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedComment = await removeUpvoteRequest({
        commentId: comment.id,
      });
      setComment(updatedComment);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to remove upvote from comment: ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (isUpdating) return;

    // Optimistic update: add downvote and remove any upvote from the user
    updateCommentState({
      ...comment,
      downvotes: [...comment.downvotes, user.id],
      upvotes: comment.upvotes.filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedComment = await downvoteCommentRequest({
        commentId: comment.id,
      });
      setComment(updatedComment);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to update comment vote: ");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveDownvote = async () => {
    if (!user) throw new Error("No authenticated user");
    if (isUpdating) return;

    // Optimistic update: remove the user's downvote
    updateCommentState({
      ...comment,
      downvotes: comment.downvotes.filter((id) => id !== user.id),
    });

    setIsUpdating(true);
    try {
      const updatedComment = await removeDownvoteRequest({
        commentId: comment.id,
      });
      setComment(updatedComment);
    } catch (err) {
      revertToPreviousState();
      handleError(err, "Failed to remove downvote from comment: ");
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    upvoteComment: handleUpvote,
    removeCommentUpvote: handleRemoveUpvote,
    downvoteComment: handleDownvote,
    removeCommentDownvote: handleRemoveDownvote,
  };
}

export default useCommentVotes;
