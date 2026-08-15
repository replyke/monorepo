import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { EstablishedConnection } from "../../../interfaces/models/Connection";
import { PaginatedResponse } from "../../../interfaces/PaginatedResponse";
import { UserSearchParams } from "../../../interfaces/UserSearch";

export interface FetchConnectionsParams extends UserSearchParams {
  page?: number;
  limit?: number;
}

function useFetchConnections(): (props?: FetchConnectionsParams) => Promise<PaginatedResponse<EstablishedConnection>> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchConnections = useCallback(
    async (
      props: FetchConnectionsParams = {}
    ): Promise<PaginatedResponse<EstablishedConnection>> => {
      const { page = 1, limit = 20, query, searchFields } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      const response = await axios.get<PaginatedResponse<EstablishedConnection>>(
        `/${projectId}/connections`,
        {
          params: {
            page,
            limit,
            query,
            searchFields,
          },
        }
      );

      return response.data;
    },
    [axios, projectId, user]
  );

  return fetchConnections;
}

export default useFetchConnections;
