import { ReplykeHttpClient } from "../../core/client";
import { AuthUser } from "../../interfaces/User";

export interface OAuthAuthorizeProps {
  provider: string;
  token: string;
  metadata?: Record<string, any>;
}

export interface OAuthAuthorizeResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

export async function authorize(
  client: ReplykeHttpClient,
  data: OAuthAuthorizeProps
): Promise<OAuthAuthorizeResponse> {
  const response = await client.projectInstance.post<OAuthAuthorizeResponse>(
    "/oauth/authorize",
    data
  );
  return response.data;
}
