import { useCallback } from "react";
import useProject from "../../projects/useProject";
import useAxiosPrivate from "../../../config/useAxiosPrivate";

export interface FetchFollowersCountByUserIdProps {
  userId: string;
}

function useFetchFollowersCountByUserId(): (props: FetchFollowersCountByUserIdProps) => Promise<{ count: number }> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchFollowersCountByUserId = useCallback(
    async ({ userId }: FetchFollowersCountByUserIdProps) => {
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

  return fetchFollowersCountByUserId;
}

export default useFetchFollowersCountByUserId;
