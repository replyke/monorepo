import { SublayHttpClient } from "../../core/client";

// mode: "code" + tokenFormat: "hex" — hex always produces a fixed 64-character
// string and ignores tokenLength entirely, so pairing it with a human-typed
// code produces something nobody can type. tokenLength is `?: never`, not just
// omitted — passing props through a variable (rather than an inline object
// literal) skips TypeScript's excess-property check, so plain omission alone
// doesn't stop `tokenLength` from sneaking through.
export interface SendCodeVerificationEmailHexProps {
  mode: "code";
  tokenFormat: "hex";
  tokenLength?: never;
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
  /** Where to send the user after the link is verified. */
  redirectUrl?: string;
}

/**
 * `mode` is required so every caller explicitly decides code vs link, and the
 * `tokenFormat`/`tokenLength` pair for "code" is a discriminated union rather
 * than two independent optionals — pairing `mode: "code"` with the default
 * `tokenFormat: "hex"` used to compile fine and silently email a 64-character
 * string no one could type.
 */
export type SendVerificationEmailProps =
  | SendCodeVerificationEmailHexProps
  | SendCodeVerificationEmailShortProps
  | SendLinkVerificationEmailProps;

export interface SendVerificationEmailResponse {
  success: boolean;
}

export async function sendVerificationEmail(
  client: SublayHttpClient,
  data: SendVerificationEmailProps
): Promise<SendVerificationEmailResponse> {
  const response =
    await client.projectInstance.post<SendVerificationEmailResponse>(
      "/auth/send-verification-email",
      data
    );
  return response.data;
}
