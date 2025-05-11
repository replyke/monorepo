import { useCallback } from "react";
import { Comment } from "../../interfaces/models/Comment";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useUpdateComment() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const updateComment = useCallback(
    async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (content.length < 1) {
        throw new Error("Comment is too short");
      }

      const response = await axios.patch(
        `/${projectId}/comments/${commentId}`,
        {
          content,
        }
      );

      return response.data as Comment;
    },
    [projectId, axios]
  );

  return updateComment;
}

export default useUpdateComment;
