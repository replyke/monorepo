import { SublayHttpClient } from "../../core/client";

export interface RequestNewAccessTokenProps {
  /** Defaults to the SDK's stored refresh token (SDK-managed mode). */
  refreshToken?: string;
}

export interface RequestNewAccessTokenResponse {
  accessToken: string;
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
  client.setAccessToken(response.data.accessToken);
  return response.data;
}
