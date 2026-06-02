import { SublayHttpClient } from "../../core/client";
import { AuthUser } from "../../interfaces/User";

export interface SignUpProps {
  email: string;
  password: string;
  name?: string;
  username?: string;
  metadata?: Record<string, any>;
}

export interface SignUpResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function signUp(
  client: SublayHttpClient,
  data: SignUpProps
): Promise<SignUpResponse> {
  const response = await client.projectInstance.post<SignUpResponse>(
    "/auth/sign-up",
    data
  );
  return response.data;
}
