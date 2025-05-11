import { useCallback } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { isReactNative } from "../../utils/isReactNative";

function useRequestNewAccessToken() {
  const { projectId } = useProject();

  const requestNewAccessToken = useCallback(
    async ({ refreshToken }: { refreshToken: string | null }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post(
        `/${projectId}/auth/request-new-access-token`,
        { refreshToken },
        {
          withCredentials: !isReactNative(), // Only use cookies for web
        }
      );

      const { accessToken, user } = response.data;
      return { accessToken, user };
    },
    [projectId]
  );

  return requestNewAccessToken;
}

export default useRequestNewAccessToken;
