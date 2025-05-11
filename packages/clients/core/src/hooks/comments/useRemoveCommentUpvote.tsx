import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Comment } from "../../interfaces/models/Comment";

function useRemoveCommentUpvote() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const removeCommentUpvote = useCallback(
    async ({ commentId }: { commentId: string }) => {
      if (!commentId) {
        throw new Error("No comment ID passed");
      }
      if (!projectId) {
        throw new Error("No project specified");
      }
      const response = await axios.patch(
        `/${projectId}/comments/${commentId}/remove-upvote`
      );
      return response.data as Comment;
    },
    [axios, projectId]
  );

  return removeCommentUpvote;
}

export default useRemoveCommentUpvote;
