import { SublayHttpClient } from "../../core/client";

export interface SignOutProps {
  /**
   * Defaults to the SDK's stored refresh token (SDK-managed mode). Pass it
   * explicitly in host-managed mode, where the SDK holds no refresh token.
   */
  refreshToken?: string;
}

export async function signOut(
  client: SublayHttpClient,
  data?: SignOutProps
): Promise<void> {
  const refreshToken = data?.refreshToken ?? client.getRefreshToken();
  await client.projectInstance.post(
    "/auth/sign-out",
    refreshToken ? { refreshToken } : {}
  );
  client.clearTokens();
}
