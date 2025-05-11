import { useCallback } from "react";
import useProject from "../projects/useProject";
import { Comment } from "../../interfaces/models/Comment";
import axios from "../../config/axios";

function useFetchComment() {
  const { projectId } = useProject();

  const fetchComment = useCallback(
    async ({
      commentId,
      withParent,
    }: {
      commentId: string;
      withParent?: boolean;
    }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!commentId) {
        throw new Error("No comment ID passed");
      }

      const response = await axios.get(`/${projectId}/comments/${commentId}`, {
        params: {
          withParent,
        },
      });

      return response.data as {
        comment: Comment;
        parentComment: Comment | null;
      };
    },
    [projectId]
  );

  return fetchComment;
}

export default useFetchComment;
