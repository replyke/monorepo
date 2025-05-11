import { EntityCommentsTree } from "../interfaces/EntityCommentsTree";

export function markCommentAsFailed(
  state: EntityCommentsTree,
  commentId: string
): EntityCommentsTree {
  const comment = state[commentId];
  const newState = { ...state };

  newState[commentId] = { ...newState[commentId], failed: true };

//   // Remove the comment from its parent’s replies
//   if (comment.comment?.parentId) {
//     const parent = newState[comment.comment.parentId];

//     newState[comment.comment.parentId] = {
//       ...parent,
//       replies: parent.replies,
//     };
//   }

  return newState;
}
