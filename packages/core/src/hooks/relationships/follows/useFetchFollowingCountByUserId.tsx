import { useCallback } from "react";
import useProject from "../../projects/useProject";
import useAxiosPrivate from "../../../config/useAxiosPrivate";

export interface FetchFollowingCountByUserIdProps {
  userId: string;
}

function useFetchFollowingCountByUserId(): (props: FetchFollowingCountByUserIdProps) => Promise<{ count: number }> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const fetchFollowingCountByUserId = useCallback(
    async ({ userId }: FetchFollowingCountByUserIdProps) => {
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

  return fetchFollowingCountByUserId;
}

export default useFetchFollowingCountByUserId;
