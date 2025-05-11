import { useCallback } from "react";

import useProject from "../projects/useProject";
import axios from "../../config/axios";

function useCheckUsernameAvailability() {
  const { projectId } = useProject();

  const checkUsernameAvailability = useCallback(
    async ({ username }: { username: string }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!username) {
        throw new Error("Please specify a username");
      }

      const response = await axios.get(`/${projectId}/users/check-username`, {
        params: { username },
      });

      return response.data as {
        available: boolean;
      };
    },
    [projectId]
  );

  return checkUsernameAvailability;
}

export default useCheckUsernameAvailability;
