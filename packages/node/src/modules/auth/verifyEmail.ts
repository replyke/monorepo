import { ReplykeHttpClient } from "../../core/client";

export interface VerifyEmailProps {
  token: string;
}

export async function verifyEmail(
  client: ReplykeHttpClient,
  data: VerifyEmailProps
): Promise<void> {
  await client.projectInstance.post("/auth/verify-email", data);
}
