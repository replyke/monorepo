import { EntityCommentsTree } from "../interfaces/EntityCommentsTree";

export function removeCommentFromTree(
  state: EntityCommentsTree,
  commentId: string
): EntityCommentsTree {
  const comment = state[commentId];
  const newState = { ...state };

  // Remove the comment itself
  delete newState[commentId];

  // Remove the comment from its parent’s replies
  if (comment.comment?.parentId) {
    const parent = newState[comment.comment.parentId];
    const { [commentId]: _, ...remainingReplies } = parent.replies;
    newState[comment.comment.parentId] = {
      ...parent,
      replies: remainingReplies,
    };
  }

  // Recursively remove all replies
  Object.keys(comment.replies).forEach((replyId) => {
    delete newState[replyId];
  });

  return newState;
}
