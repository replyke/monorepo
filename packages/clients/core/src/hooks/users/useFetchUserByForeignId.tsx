import { useCallback } from "react";

import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { User } from "../../interfaces/models/User";

function useFetchUserByForeignId() {
  const { projectId } = useProject();

  const fetchUserByForeignId = useCallback(
    async ({ foreignId }: { foreignId: string }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!foreignId) {
        throw new Error("Please specify a foreign ID");
      }

      const response = await axios.get(`/${projectId}/users/by-foreign-id`, {
        params: { foreignId },
      });

      return response.data as User;
    },
    [projectId]
  );

  return fetchUserByForeignId;
}

export default useFetchUserByForeignId;
