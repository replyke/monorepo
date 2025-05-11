import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import useUser from "../useUser";

function useFetchFollow() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const fetchFollow = useCallback(
    async (props: { userId: string }) => {
      const { userId } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!user) {
        throw new Error("No user is logged in");
      }

      if (!userId) {
        throw new Error("No user ID was provided");
      }

      if (userId === user.id) {
        throw new Error("Users don't follow themselves");
      }

      const response = await axios.get(`/${projectId}/users/${userId}/follow`, {
        withCredentials: true,
      });
      return response.data as { isFollowing: boolean };
    },
    [axios, projectId, user]
  );

  return fetchFollow;
}

export default useFetchFollow;
