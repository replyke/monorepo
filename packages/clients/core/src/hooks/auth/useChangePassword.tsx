import { useCallback } from "react";
import useProject from "../projects/useProject";
import axios from "../../config/axios";
import { isReactNative } from "../../utils/isReactNative";

function useChangePassword() {
  const { projectId } = useProject();

  const changePassword = useCallback(
    async ({
      password,
      newPassword,
    }: {
      password: string;
      newPassword: string;
    }) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      await axios.post(
        `/${projectId}/auth/change-password`,
        {
          password,
          newPassword,
        },
        { withCredentials: !isReactNative() }
      );
    },
    [projectId]
  );

  return changePassword;
}

export default useChangePassword;
