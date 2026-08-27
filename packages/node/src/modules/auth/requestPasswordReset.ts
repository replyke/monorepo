import { SublayHttpClient } from "../../core/client";

export interface RequestPasswordResetProps {
  email: string;
}

export async function requestPasswordReset(
  client: SublayHttpClient,
  data: RequestPasswordResetProps
): Promise<void> {
  await client.projectInstance.post("/auth/request-password-reset", data);
}
