import { useCallback } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { isReactNative } from "../../utils/isReactNative";

function useSignInWithEmailAndPassword() {
  const { projectId } = useProject();

  const signInWithEmailAndPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post(
        `/${projectId}/auth/sign-in`,
        {
          email,
          password,
        },
        { withCredentials: !isReactNative() }
      );

      const { accessToken, refreshToken, user } = response.data;

      return { accessToken, refreshToken, user };
    },
    [projectId]
  );

  return signInWithEmailAndPassword;
}

export default useSignInWithEmailAndPassword;
