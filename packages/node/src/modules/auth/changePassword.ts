import { SublayHttpClient } from "../../core/client";

export interface ChangePasswordProps {
  userId: string;
  /** The user's current password (verified before the change). */
  password: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export async function changePassword(
  client: SublayHttpClient,
  data: ChangePasswordProps
): Promise<ChangePasswordResponse> {
  const response = await client.projectInstance.post<ChangePasswordResponse>(
    "/auth/change-password",
    data
  );
  return response.data;
}
