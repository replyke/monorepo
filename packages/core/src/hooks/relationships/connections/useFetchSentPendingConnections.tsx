import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { PendingConnection } from "../../../interfaces/models/Connection";
import { PaginatedResponse } from "../../../interfaces/PaginatedResponse";

export interface FetchSentPendingConnectionsParams {
  page?: number;
  limit?: number;
}

function useFetchSentPendingConnections(): (props?: FetchSentPendingConnectionsParams) => Promise<PaginatedResponse<PendingConnection>> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchSentPendingConnections = useCallback(
    async (
      props: FetchSentPendingConnectionsParams = {}
    ): Promise<PaginatedResponse<PendingConnection>> => {
      const { page = 1, limit = 20 } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      const response = await axios.get<PaginatedResponse<PendingConnection>>(
        `/${projectId}/connections/pending/sent`,
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

  return fetchSentPendingConnections;
}

export default useFetchSentPendingConnections;