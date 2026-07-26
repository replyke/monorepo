import { SublayHttpClient } from "../../core/client";

export interface SetPasswordProps {
  newPassword: string;
}

export interface SetPasswordResponse {
  success: boolean;
  message: string;
}

export async function setPassword(
  client: SublayHttpClient,
  data: SetPasswordProps
): Promise<SetPasswordResponse> {
  const response = await client.projectInstance.post<SetPasswordResponse>(
    "/auth/set-password",
    data
  );
  return response.data;
}
