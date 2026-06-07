import { SublayHttpClient } from "../../core/client";

export interface RequestNewAccessTokenProps {
  /** Defaults to the SDK's stored refresh token (SDK-managed mode). */
  refreshToken?: string;
}

export interface RequestNewAccessTokenResponse {
  accessToken: string;
  /** The server rotates the refresh token on every refresh and returns the new one. */
  refreshToken?: string;
}

/**
 * Manually rotate the access token. The SDK auto-refreshes on 403 in
 * SDK-managed mode, so this is rarely needed directly; it's exposed for parity
 * and for host-managed callers that own their own refresh flow.
 */
export async function requestNewAccessToken(
  client: SublayHttpClient,
  data?: RequestNewAccessTokenProps
): Promise<RequestNewAccessTokenResponse> {
  const refreshToken = data?.refreshToken ?? client.getRefreshToken();
  if (!refreshToken) {
    throw new Error(
      "requestNewAccessToken: no refresh token available (none stored and none provided)."
    );
  }
  const response =
    await client.projectInstance.post<RequestNewAccessTokenResponse>(
      "/auth/request-new-access-token",
      { refreshToken }
    );
  // Persist the rotated refresh token (SDK-managed mode); a no-op in
  // host-managed mode where the host owns token storage.
  const { accessToken, refreshToken: rotated } = response.data;
  if (rotated) client.setTokens({ accessToken, refreshToken: rotated });
  else client.setAccessToken(accessToken);
  return response.data;
}
