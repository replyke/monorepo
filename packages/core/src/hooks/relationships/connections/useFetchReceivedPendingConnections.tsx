import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { PendingConnection } from "../../../interfaces/models/Connection";
import { PaginatedResponse } from "../../../interfaces/PaginatedResponse";

export interface FetchReceivedPendingConnectionsParams {
  page?: number;
  limit?: number;
}

function useFetchReceivedPendingConnections(): (props?: FetchReceivedPendingConnectionsParams) => Promise<PaginatedResponse<PendingConnection>> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchReceivedPendingConnections = useCallback(
    async (
      props: FetchReceivedPendingConnectionsParams = {}
    ): Promise<PaginatedResponse<PendingConnection>> => {
      const { page = 1, limit = 20 } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      const response = await axios.get<PaginatedResponse<PendingConnection>>(
        `/${projectId}/connections/pending/received`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      return response.data;
    },
    [axios, projectId, user]
  );

  return fetchReceivedPendingConnections;
}

export default useFetchReceivedPendingConnections;