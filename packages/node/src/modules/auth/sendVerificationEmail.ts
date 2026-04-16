import { ReplykeHttpClient } from "../../core/client";

export interface SendVerificationEmailProps {
  email: string;
}

export async function sendVerificationEmail(
  client: ReplykeHttpClient,
  data: SendVerificationEmailProps
): Promise<void> {
  await client.projectInstance.post("/auth/send-verification-email", data);
}
