import { useCallback } from "react";
import useProject from "../projects/useProject";
import { Comment, CommentIncludeParam } from "../../interfaces/models/Comment";
import useAxiosPrivate from "../../config/useAxiosPrivate";

export interface FetchCommentByForeignIdProps {
  foreignId: string;
  include?: CommentIncludeParam;
}

function useFetchCommentByForeignId(): (props: FetchCommentByForeignIdProps) => Promise<{ comment: Comment }> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchCommentByForeignId = useCallback(
    async ({ foreignId, include }: FetchCommentByForeignIdProps) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!foreignId) {
        throw new Error("No foreign ID passed");
      }

      const params: Record<string, any> = {
        foreignId,
      };

      if (include) {
        params.include = Array.isArray(include) ? include.join(',') : include;
      }

      const response = await axios.get(`/${projectId}/comments/by-foreign-id`, {
        params,
      });

      return response.data as {
        comment: Comment;
      };
    },
    [axios, projectId]
  );

  return fetchCommentByForeignId;
}

export default useFetchCommentByForeignId;
