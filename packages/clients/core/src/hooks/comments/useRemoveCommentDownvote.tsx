import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Comment } from "../../interfaces/models/Comment";

function useRemoveCommentDownvote() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const removeCommentDownvote = useCallback(
    async ({ commentId }: { commentId: string }) => {
      if (!commentId) {
        throw new Error("No comment ID passed");
      }
      if (!projectId) {
        throw new Error("No project specified");
      }
      const response = await axios.patch(
        `/${projectId}/comments/${commentId}/remove-downvote`
      );
      return response.data as Comment;
    },
    [axios, projectId]
  );

  return removeCommentDownvote;
}

export default useRemoveCommentDownvote;
