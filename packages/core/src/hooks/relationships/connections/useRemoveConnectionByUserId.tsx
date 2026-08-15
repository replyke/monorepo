import { useCallback } from "react";
import useAxiosPrivate from "../../../config/useAxiosPrivate";
import useProject from "../../projects/useProject";
import { useUser } from "../../user";
import { RemoveConnectionByUserIdResponse } from "../../../interfaces/models/Connection";

export interface RemoveConnectionByUserIdProps {
  userId: string;
}

function useRemoveConnectionByUserId(): (props: RemoveConnectionByUserIdProps) => Promise<RemoveConnectionByUserIdResponse> {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();
  const { user } = useUser();

  const removeConnectionByUserId = useCallback(
    async (props: RemoveConnectionByUserIdProps): Promise<RemoveConnectionByUserIdResponse> => {
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
        throw new Error("Cannot disconnect from yourself");
      }

      const response = await axios.delete(
        `/${projectId}/users/${userId}/connection`
      );

      return response.data as RemoveConnectionByUserIdResponse;
    },
    [axios, projectId, user]
  );

  return removeConnectionByUserId;
}

export default useRemoveConnectionByUserId;