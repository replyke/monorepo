import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Comment } from "../../interfaces/models/Comment";

function useDownvoteComment() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const downvoteComment = useCallback(
    async ({ commentId }: { commentId: string }) => {
      if (!commentId) {
        throw new Error("No comment ID passed");
      }
      if (!projectId) {
        throw new Error("No project specified");
      }
      const response = await axios.patch(
        `/${projectId}/comments/${commentId}/downvote`
      );
      return response.data as Comment;
    },
    [axios, projectId]
  );

  return downvoteComment;
}

export default useDownvoteComment;
