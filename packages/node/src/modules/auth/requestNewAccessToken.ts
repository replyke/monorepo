import { ReplykeHttpClient } from "../../core/client";

export interface RequestNewAccessTokenProps {
  refreshToken: string;
}

export interface RequestNewAccessTokenResponse {
  accessToken: string;
}

export async function requestNewAccessToken(
  client: ReplykeHttpClient,
  data: RequestNewAccessTokenProps
): Promise<RequestNewAccessTokenResponse> {
  const response =
    await client.projectInstance.post<RequestNewAccessTokenResponse>(
      "/auth/request-new-access-token",
      data
    );
  return response.data;
}
