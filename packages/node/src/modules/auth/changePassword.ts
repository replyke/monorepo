import { ReplykeHttpClient } from "../../core/client";

export interface ChangePasswordProps {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(
  client: ReplykeHttpClient,
  data: ChangePasswordProps
): Promise<void> {
  await client.projectInstance.post("/auth/change-password", data);
}
