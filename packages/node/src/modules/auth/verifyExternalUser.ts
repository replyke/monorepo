import { ReplykeHttpClient } from "../../core/client";
import { AuthUser } from "../../interfaces/User";

export interface VerifyExternalUserProps {
  userJwt: string;
}

export interface VerifyExternalUserResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function verifyExternalUser(
  client: ReplykeHttpClient,
  data: VerifyExternalUserProps
): Promise<VerifyExternalUserResponse> {
  const response =
    await client.projectInstance.post<VerifyExternalUserResponse>(
      "/auth/verify-external-user",
      data
    );
  return response.data;
}
