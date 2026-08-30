import { useCallback } from "react";
import useAxiosPrivate from "../../config/useAxiosPrivate";
import useProject from "../projects/useProject";

// mode: "code" + tokenFormat: "hex" — hex always produces a fixed 64-character
// string and ignores tokenLength entirely, so pairing it with a human-typed
// code produces something nobody can type. tokenLength is deliberately absent
// here; passing it would silently do nothing.
export interface SendCodeVerificationEmailHexProps {
  mode: "code";
  tokenFormat: "hex";
}

// mode: "code" + a short format — tokenLength is required so the caller makes
// a deliberate choice about how long the code a user has to type actually is.
export interface SendCodeVerificationEmailShortProps {
  mode: "code";
  tokenFormat: "numeric" | "alpha" | "alphanumeric";
  tokenLength: number;
}

// mode: "link" — the token is embedded in a URL, never read by a human, so
// format/length are just entropy choices with sensible server-side defaults.
export interface SendLinkVerificationEmailProps {
  mode: "link";
  tokenFormat?: "hex" | "numeric" | "alpha" | "alphanumeric";
  tokenLength?: number;
  redirectUrl?: string;
}

/**
 * `mode` is required so every caller explicitly decides code vs link, and the
 * `tokenFormat`/`tokenLength` pair for "code" is a discriminated union rather
 * than two independent optionals — pairing `mode: "code"` with the default
 * `tokenFormat: "hex"` used to compile fine and silently email a 64-character
 * string no one could type. Calling the REST API directly (bypassing this SDK)
 * still gets the server's own defaults — see
 * server/src/v7/validation/auth/auth.schema.ts.
 */
export type SendVerificationEmailProps =
  | SendCodeVerificationEmailHexProps
  | SendCodeVerificationEmailShortProps
  | SendLinkVerificationEmailProps;

function useSendVerificationEmail(): (props: SendVerificationEmailProps) => Promise<{ success: boolean }> {
  const { projectId } = useProject();
  const axios = useAxiosPrivate();

  const sendVerificationEmail = useCallback(
    async (props: SendVerificationEmailProps) => {
      if (!projectId) {
        throw new Error("No projectId available.");
      }

      const response = await axios.post(
        `/${projectId}/auth/send-verification-email`,
        props
      );

      return response.data;
    },
    [projectId, axios]
  );

  return sendVerificationEmail;
}

export default useSendVerificationEmail;
