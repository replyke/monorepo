import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { Comment } from "../../interfaces/models/Comment";

function useUpvoteComment() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const upvoteComment = useCallback(
    async ({ commentId }: { commentId: string }) => {
      if (!commentId) {
        throw new Error("No comment ID passed");
      }
      if (!projectId) {
        throw new Error("No project specified");
      }
      const response = await axios.patch(
        `/${projectId}/comments/${commentId}/upvote`
      );
      return response.data as Comment;
    },
    [axios, projectId]
  );

  return upvoteComment;
}

export default useUpvoteComment;
