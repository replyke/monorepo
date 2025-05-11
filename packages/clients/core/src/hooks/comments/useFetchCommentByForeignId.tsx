import { useCallback } from "react";
import useProject from "../projects/useProject";
import { Comment } from "../../interfaces/models/Comment";
import axios from "../../config/axios";

function useFetchCommentByForeignId() {
  const { projectId } = useProject();

  const fetchCommentByForeignId = useCallback(
    async ({
      foreignId,
      withParent,
    }: {
      foreignId: string;
      withParent?: boolean;
    }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!foreignId) {
        throw new Error("No foreign ID passed");
      }

      const response = await axios.get(`/${projectId}/comments/by-foreign-id`, {
        params: {
          withParent,
          foreignId,
        },
      });

      return response.data as {
        comment: Comment;
        parentComment: Comment | null;
      };
    },
    [projectId]
  );

  return fetchCommentByForeignId;
}

export default useFetchCommentByForeignId;
