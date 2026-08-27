import { SublayHttpClient } from "../../core/client";
import { ListIdentitiesResponse } from "../../interfaces/OAuthIdentity";

export async function listIdentities(
  client: SublayHttpClient
): Promise<ListIdentitiesResponse> {
  const response = await client.projectInstance.get<ListIdentitiesResponse>(
    "/oauth/identities"
  );
  return response.data;
}
