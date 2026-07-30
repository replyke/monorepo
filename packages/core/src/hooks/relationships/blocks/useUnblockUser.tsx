import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";

export interface UnblockUserProps {
  userId: string;
}

function useUnblockUser(): (props: UnblockUserProps) => Promise<void> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const unblockUser = useCallback(
    async (props: UnblockUserProps) => {
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
        throw new Error("Users can't unblock themselves");
      }

      await axios.delete(`/${projectId}/users/${userId}/block`);
    },
    [axios, projectId, user]
  );

  return unblockUser;
}

export default useUnblockUser;
