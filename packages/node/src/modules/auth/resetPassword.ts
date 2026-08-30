import { SublayHttpClient } from "../../core/client";

export interface ResetPasswordProps {
  token: string;
  newPassword: string;
}

export async function resetPassword(
  client: SublayHttpClient,
  data: ResetPasswordProps
): Promise<void> {
  await client.projectInstance.post("/auth/reset-password", data);
}
