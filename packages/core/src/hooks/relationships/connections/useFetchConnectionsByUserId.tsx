import { useCallback } from "react";
import useProject from "../../projects/useProject";
import { EstablishedConnection } from "../../../interfaces/models/Connection";
import { PaginatedResponse } from "../../../interfaces/PaginatedResponse";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import { SpaceReputationUserParams } from "../../../interfaces/SpaceReputation";
import { UserSearchParams } from "../../../interfaces/UserSearch";
import { buildSpaceReputationParams } from "../../../utils/spaceReputationParams";

export interface FetchConnectionsByUserIdParams
  extends SpaceReputationUserParams,
    UserSearchParams {
  userId: string;
  page?: number;
  limit?: number;
}

function useFetchConnectionsByUserId(): (props: FetchConnectionsByUserIdParams) => Promise<PaginatedResponse<EstablishedConnection>> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchConnectionsByUserId = useCallback(
    async (
      props: FetchConnectionsByUserIdParams
    ): Promise<PaginatedResponse<EstablishedConnection>> => {
      const { userId, page = 1, limit = 20, query, searchFields, spaceReputation, spaceReputationId, spaceReputationDescendants } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!userId) {
        throw new Error("No user ID was provided");
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

      const response = await axios.get<PaginatedResponse<EstablishedConnection>>(
        `/${projectId}/users/${userId}/connections`,
        {
          params,
        }
      );

      return response.data;
    },
    [axios, projectId]
  );

  return fetchConnectionsByUserId;
}

export default useFetchConnectionsByUserId;
