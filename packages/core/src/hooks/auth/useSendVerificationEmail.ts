import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

export interface SendVerificationEmailProps {
  mode?: "code" | "link";
  tokenFormat?: "hex" | "numeric" | "alpha" | "alphanumeric";
  tokenLength?: number;
  redirectUrl?: string;
}

function useSendVerificationEmail(): (props?: SendVerificationEmailProps) => Promise<{ success: boolean }> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const sendVerificationEmail = useCallback(
    async (props?: SendVerificationEmailProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post(
        `/${projectId}/auth/send-verification-email`,
        props ?? {}
      );

      return response.data;
    },
    [projectId, axios]
  );

  return sendVerificationEmail;
}

export default useSendVerificationEmail;
