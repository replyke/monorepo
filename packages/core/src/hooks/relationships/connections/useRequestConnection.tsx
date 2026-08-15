import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { ConnectionRequestParams, ConnectionActionResponse } from "../../../interfaces/models/Connection";

function useRequestConnection(): (props: ConnectionRequestParams) => Promise<ConnectionActionResponse> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const requestConnection = useCallback(
    async (props: ConnectionRequestParams): Promise<ConnectionActionResponse> => {
      const { userId, message } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!userId) {
        throw new Error("No user ID was provided");
      }

      const response = await axios.post(
        `/${projectId}/users/${userId}/connection`,
        { message }
      );

      return response.data as ConnectionActionResponse;
    },
    [axios, projectId]
  );

  return requestConnection;
}

export default useRequestConnection;