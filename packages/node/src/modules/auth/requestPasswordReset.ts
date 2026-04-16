import { ReplykeHttpClient } from "../../core/client";

export interface RequestPasswordResetProps {
  email: string;
}

export async function requestPasswordReset(
  client: ReplykeHttpClient,
  data: RequestPasswordResetProps
): Promise<void> {
  await client.projectInstance.post("/auth/request-password-reset", data);
}
