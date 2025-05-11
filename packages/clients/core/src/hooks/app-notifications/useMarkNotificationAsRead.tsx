import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { useUser } from "../users";

function useMarkNotificationAsRead() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) {
        throw new Error("No authenticated user");
      }

      if (!projectId) {
        throw new Error("No projectId available.");
      }

      if (!notificationId) {
        throw new Error("No notification ID provided.");
      }

      await axios.patch<number>(
        `/${projectId}/app-notifications/${notificationId}/mark-as-read`,
        {},
        { withCredentials: true }
      );
    },
    [projectId, axios, user]
  );

  return markNotificationAsRead;
}

export default useMarkNotificationAsRead;
