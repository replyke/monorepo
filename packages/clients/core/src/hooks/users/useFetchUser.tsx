import { useCallback } from "react";

import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { User } from "../../interfaces/models/User";

function useFetchUser() {
  const { projectId } = useProject();

  const fetchUser = useCallback(
    async ({ userId }: { userId: string }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!userId) {
        throw new Error("Please specify a user ID");
      }

      const response = await axios.get(`/${projectId}/users/${userId}`);

      return response.data as User;
    },
    [projectId]
  );

  return fetchUser;
}

export default useFetchUser;
