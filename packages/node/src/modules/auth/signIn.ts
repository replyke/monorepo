import { SublayHttpClient } from "../../core/client";
import { AuthUser } from "../../interfaces/User";

export interface SignInProps {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function signIn(
  client: SublayHttpClient,
  data: SignInProps
): Promise<SignInResponse> {
  const response = await client.projectInstance.post<SignInResponse>(
    "/auth/sign-in",
    data
  );
  return response.data;
}
