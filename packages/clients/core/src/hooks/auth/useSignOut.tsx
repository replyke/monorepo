import { useCallback } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { isReactNative } from "../../utils/isReactNative";

function useSignOut() {
  const { projectId } = useProject();

  const signOut = useCallback(
    async ({ refreshToken }: { refreshToken: string | null }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      await axios.post(
        `/${projectId}/auth/sign-out`,
        { refreshToken },
        { withCredentials: !isReactNative() }
      );
    },
    [projectId]
  );

  return signOut;
}

export default useSignOut;
