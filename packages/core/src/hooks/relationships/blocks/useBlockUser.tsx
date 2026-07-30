import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";

export interface BlockUserProps {
  userId: string;
}

function useBlockUser(): (props: BlockUserProps) => Promise<void> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const blockUser = useCallback(
    async (props: BlockUserProps) => {
      const { userId } = props;
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!userId) {
        throw new Error("No user ID was provided");
      }

      await axios.post(
        `/${projectId}/users/${userId}/block`,
        {}
      );
    },
    [axios, projectId]
  );

  return blockUser;
}

export default useBlockUser;
