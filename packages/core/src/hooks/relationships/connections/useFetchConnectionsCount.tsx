import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { ConnectionCountResponse } from "../../../interfaces/models/Connection";

function useFetchConnectionsCount(): () => Promise<ConnectionCountResponse> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchConnectionsCount = useCallback(
    async (): Promise<ConnectionCountResponse> => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      const response = await axios.get(
        `/${projectId}/connections/count`
      );

      return response.data as ConnectionCountResponse;
    },
    [axios, projectId, user]
  );

  return fetchConnectionsCount;
}

export default useFetchConnectionsCount;