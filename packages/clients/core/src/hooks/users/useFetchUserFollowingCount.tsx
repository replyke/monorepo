import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

function useFetchUserFollowingCount() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const fetchUserFollowingCount = useCallback(
    async ({ userId }: { userId: string }) => {
      if (!userId) {
        throw new Error("No userId provided.");
      }

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.get(
        `/${projectId}/users/${userId}/following-count`
      );

      return response.data as { count: number };
    },
    [axios, projectId]
  );

  return fetchUserFollowingCount;
}

export default useFetchUserFollowingCount;
