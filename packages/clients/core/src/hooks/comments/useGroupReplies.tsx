import { Comment } from "../../interfaces/models/Comment";
import useCommentSection from "./useCommentSection";

function useGroupReplies({ commentId }: { commentId: string }): {
  replies: Comment[];
  newReplies: Comment[];
} {
  const { entityCommentsTree } = useCommentSection();

  const commentData = entityCommentsTree![commentId];
  if (!commentData) {
    return { replies: [], newReplies: [] }; // If the commentID is not found, return an empty array
  }

  const allReplies = commentData.replies;
  const replies = Object.values(allReplies).filter((reply) => !reply.new);

  const newReplies = Object.values(allReplies)
    .filter((reply) => !!reply.new)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return { replies, newReplies };
}

export default useGroupReplies;
