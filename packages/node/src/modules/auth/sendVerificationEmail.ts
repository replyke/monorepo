import { SublayHttpClient } from "../../core/client";

export interface SendVerificationEmailProps {
  userId: string;
  /** "code" emails a short token; "link" emails a verification URL. Defaults to "code". */
  mode?: "code" | "link";
  tokenFormat?: "hex" | "numeric" | "alpha" | "alphanumeric";
  tokenLength?: number;
  /** For mode "link": where to send the user after the link is verified. */
  redirectUrl?: string;
}

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
