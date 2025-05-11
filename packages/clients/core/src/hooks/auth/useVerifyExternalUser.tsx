import { useCallback } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";

function useVerifyExternalUser() {
  const { projectId } = useProject();

  const verifyExternalUser = useCallback(
    async ({ userJwt }: { userJwt: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post(
        `/${projectId}/auth/verify-external-user`,
        {
          userJwt,
        }
      );

      const { accessToken, refreshToken, user } = response.data;

      return { accessToken, refreshToken, user };
    },
    [projectId]
  );

  return verifyExternalUser;
}

export default useVerifyExternalUser;
