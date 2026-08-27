import { SublayHttpClient } from "../../core/client";
import { ListIdentitiesResponse } from "../../interfaces/OAuthIdentity";

/** List the current user's linked OAuth identities (authenticated). */
export async function listIdentities(
  client: SublayHttpClient
): Promise<ListIdentitiesResponse> {
  const response = await client.projectInstance.get<ListIdentitiesResponse>(
    "/oauth/identities"
  );
  return response.data;
}
