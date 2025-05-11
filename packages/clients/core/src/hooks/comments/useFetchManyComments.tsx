import { useCallback } from "react";
import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";
import { Comment } from "../../interfaces/models/Comment";
import useProject from "../projects/useProject";
import axios from "../../config/axios";

function useFetchManyComments() {
  const { projectId } = useProject();

  const fetchComments = useCallback(
    async (props: {
      entityId?: string | null | undefined;
      userId?: string | null | undefined;
      parentId?: string | null | undefined;
      sortBy?: CommentsSortByOptions;
      page: number;
      limit?: number;
      includeEntity?: boolean;
    }): Promise<Comment[]> => {
      const { entityId, userId, parentId, sortBy, page, limit, includeEntity } =
        props;

      if (page === 0) {
        throw new Error("Can't fetch comments with page 0");
      }

      if (limit === 0) {
        throw new Error("Can't fetch with limit 0");
      }

      if (!sortBy) {
        throw new Error("Can't fetch without sortBy property");
      }

      if (!entityId && !userId && !parentId)
        throw new Error(
          "Either entityId, userId or parentId properties are required to fetch comments"
        );

      if (!projectId) {
        throw new Error("No project specified");
      }

      const response = await axios.get(`/${projectId}/comments`, {
        params: {
          entityId,
          userId,
          parentId,
          sortBy,
          page,
          limit,
          includeEntity,
        },
      });
      return response.data as Comment[];
    },
    [projectId]
  );

  return fetchComments;
}

export default useFetchManyComments;
