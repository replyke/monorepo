import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";
import { AuthUser } from "../../interfaces/models/User";

export type UpdateUserParams = {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  bio?: string;
  birthdate?: Date | null;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  metadata?: Record<string, any>;
  secureMetadata?: Record<string, any>;
};

function useUpdateUser() {
  const axios = useAxiosPrivate();
  const { projectId } = useProject();

  const updateUser = useCallback(
    async ({
      userId,
      update,
    }: {
      userId: string;
      update: UpdateUserParams;
    }) => {
      if (!projectId) {
        throw new Error("No project specified");
      }

      if (!update || Object.keys(update).length == 0) {
        console.error("Update object is empty");
      }

      const response = await axios.patch(
        `/${projectId}/users/${userId}`,
        {
          update,
        },
        { withCredentials: true }
      );

      return response.data as AuthUser;
    },
    [projectId, axios]
  );

  return updateUser;
}

export default useUpdateUser;
