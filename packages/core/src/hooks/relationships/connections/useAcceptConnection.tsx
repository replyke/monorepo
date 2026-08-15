import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { ConnectionActionResponse } from "../../../interfaces/models/Connection";

export interface AcceptConnectionProps {
  connectionId: string;
}

function useAcceptConnection(): (props: AcceptConnectionProps) => Promise<ConnectionActionResponse> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const acceptConnection = useCallback(
    async (props: AcceptConnectionProps): Promise<ConnectionActionResponse> => {
      const { connectionId } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      if (!connectionId) {
        throw new Error("No connection ID was provided");
      }

      const response = await axios.patch(
        `/${projectId}/connections/${connectionId}/accept`,
        {}
      );

      return response.data as ConnectionActionResponse;
    },
    [axios, projectId, user]
  );

  return acceptConnection;
}

export default useAcceptConnection;