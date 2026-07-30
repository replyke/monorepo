import { useCallback } from "react";
import { CommentsSortByOptions } from "../../interfaces/CommentsSortByOptions";
import { Comment, CommentIncludeParam } from "../../interfaces/models/Comment";
import { PaginatedResponse } from "../../interfaces/PaginatedResponse";
import useProject from "../projects/useProject";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import { SpaceReputationContextParams } from "../../interfaces/SpaceReputation";
import { buildSpaceReputationParams } from "../../utils/spaceReputationParams";
import { BlockedFilter } from "../../interfaces/BlockedFilter";

export interface FetchManyCommentsProps extends SpaceReputationContextParams {
  entityId?: string | null | undefined;
  userId?: string | null | undefined;
  parentId?: string | null | undefined;
  sortBy?: CommentsSortByOptions;
  /** Sort direction for `sortBy: "createdAt"`. Defaults to "desc". */
  sortDir?: "asc" | "desc";
  page: number;
  limit?: number;
  include?: CommentIncludeParam;
  sourceId?: string | null | undefined;
  blockedFilter?: BlockedFilter | null;
}

function useFetchManyComments(): (props: FetchManyCommentsProps) => Promise<PaginatedResponse<Comment>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchComments = useCallback(
    async (props: FetchManyCommentsProps): Promise<PaginatedResponse<Comment>> => {
      const {
        entityId,
        userId,
        parentId,
        sortBy,
        sortDir,
        page,
        limit,
        include,
        sourceId,
        blockedFilter,
        spaceReputation,
        spaceReputationId,
        spaceReputationDescendants,
      } = props;

      if (page === 0) {
        throw new Error("Can't fetch comments with page 0");
      }

      if (limit === 0) {
        throw new Error("Can't fetch with limit 0");
      }

      if (!projectId) {
        throw new Error("No project specified");
      }

      const params: Record<string, any> = {
        sortBy,
        page,
        limit,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      };

      if (sortDir) params.sortDir = sortDir;
      if (entityId) params.entityId = entityId;
      if (userId) params.userId = userId;
      if (parentId) params.parentId = parentId;
      if (sourceId) params.sourceId = sourceId;
      if (blockedFilter) params.blockedFilter = blockedFilter;

      if (include) {
        params.include = Array.isArray(include) ? include.join(',') : include;
      }

      const response = await axios.get<PaginatedResponse<Comment>>(
        `/${projectId}/comments`,
        {
          params,
        }
      );
      return response.data;
    },
    [projectId, axios]
  );

  return fetchComments;
}

export default useFetchManyComments;
