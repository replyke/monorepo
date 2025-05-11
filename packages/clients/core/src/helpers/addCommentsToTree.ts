import { Comment } from "../interfaces/models/Comment";
import { EntityCommentsTree } from "../interfaces/EntityCommentsTree";
import { handleError } from "../utils/handleError";

function addSingleCommentToTree(
  entityCommentsTree: EntityCommentsTree,
  newComment: Comment,
  newlyAdded?: boolean
): EntityCommentsTree {
  try {
    if (newComment.parentId) {
      // Previously, changing the comment sort order and triggering a fresh fetch caused issues: replies from previously loaded comments
      // would sometimes be re-added to the comment tree, likely due to a state change triggering re-insertion before the UI fully cleared them.
      // This led to partial items in the tree (replies without their parent comment), resulting in crashes.
      //
      // The condition below ensures we don't add replies if their parent comment isn't present.
      // TODO: This solution prevents errors and serves as a useful safeguard. However, it's worth investigating why replies are re-fetching and attempting to re-add, as this causes redundant server calls, even though it no longer leads to errors.

      if (!entityCommentsTree[newComment.parentId]) return entityCommentsTree;

      return {
        ...entityCommentsTree,
        [newComment.parentId]: {
          ...entityCommentsTree[newComment.parentId],
          replies: {
            ...(entityCommentsTree[newComment.parentId]?.replies || []),
            [newComment.id]: { ...newComment, new: !!newlyAdded },
          },
        },
        [newComment.id]: {
          comment: newComment,
          replies: {},
          new: !!newlyAdded,
        },
      };
    } else {
      return {
        ...entityCommentsTree,
        [newComment.id]: {
          comment: newComment,
          replies: {},
          new: !!newlyAdded,
        },
      };
    }
  } catch (err) {
    handleError(err, "Failed to add a comment to the tree");
    throw new Error();
  }
}

export const addCommentsToTree = (
  setEntityCommentsTree: (
    value: React.SetStateAction<EntityCommentsTree>
  ) => void,
  newComments: Comment[] | undefined,
  newlyAdded?: boolean
) => {
  setEntityCommentsTree((prevCommentsTree) => {
    let newTree = prevCommentsTree;

    if (newComments) {
      for (const comment of newComments) {
        newTree = addSingleCommentToTree(newTree, comment, newlyAdded);
      }
    }

    return newTree;
  });
};
