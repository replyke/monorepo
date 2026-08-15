import { useCallback } from "react";
import useProject from "../../projects/useProject";
import type { User } from "../../../interfaces/models/User";
import { PaginatedResponse } from "../../../interfaces/PaginatedResponse";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import { SpaceReputationUserParams } from "../../../interfaces/SpaceReputation";
import { UserSearchParams } from "../../../interfaces/UserSearch";
import { buildSpaceReputationParams } from "../../../utils/spaceReputationParams";

export interface FollowerWithFollowInfo {
  followId: string;
  user: User;
  followedAt: string;
}

export interface FetchFollowersByUserIdParams
  extends SpaceReputationUserParams,
    UserSearchParams {
  userId: string;
  page?: number;
  limit?: number;
}

function useFetchFollowersByUserId(): (params: FetchFollowersByUserIdParams) => Promise<PaginatedResponse<FollowerWithFollowInfo>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchFollowersByUserId = useCallback(
    async ({ userId, page = 1, limit = 20, query, searchFields, spaceReputation, spaceReputationId, spaceReputationDescendants }: FetchFollowersByUserIdParams) => {
      if (!userId) {
        throw new Error("No userId provided.");
      }

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const params: Record<string, any> = {
        page,
        limit,
        query,
        searchFields,
        ...buildSpaceReputationParams({
          spaceReputation,
          spaceReputationId,
          spaceReputationDescendants,
        }),
      };

      const response = await axios.get<PaginatedResponse<FollowerWithFollowInfo>>(
        `/${projectId}/users/${userId}/followers`,
        { params }
      );

      return response.data;
    },
    [axios, projectId]
  );

  return fetchFollowersByUserId;
}

export default useFetchFollowersByUserId;
