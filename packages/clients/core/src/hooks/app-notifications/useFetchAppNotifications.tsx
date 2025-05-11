import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { UnifiedAppNotification } from "../../interfaces/models/AppNotification";
import useUser from "../users/useUser";

function useFetchAppNotifications() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchAppNotifications = useCallback(
    async ({ page, limit }: { page: number; limit: number }) => {
      if (!user) {
        throw new Error("No authenticated user");
      }

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.get<UnifiedAppNotification[]>(
        `/${projectId}/app-notifications`,
        {
          params: {
            page,
            limit,
          },
          withCredentials: true,
        }
      );

      return response.data as UnifiedAppNotification[];
    },
    [projectId, axios, user]
  );

  return fetchAppNotifications;
}

export default useFetchAppNotifications;
