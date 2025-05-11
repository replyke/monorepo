import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useFetchUserFollowersCount() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const fetchUserFollowersCount = useCallback(
    async ({ userId }: { userId: string }) => {
      if (!userId) {
        throw new Error("No userId provided.");
      }

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.get(
        `/${projectId}/users/${userId}/followers-count`
      );

      return response.data as { count: number };
    },
    [axios, projectId]
  );

  return fetchUserFollowersCount;
}

export default useFetchUserFollowersCount;
