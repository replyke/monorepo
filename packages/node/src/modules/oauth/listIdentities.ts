import { ReplykeHttpClient } from "../../core/client";
import { ListIdentitiesResponse } from "../../interfaces/OAuthIdentity";

export async function listIdentities(
  client: ReplykeHttpClient
): Promise<ListIdentitiesResponse> {
  const response = await client.projectInstance.get<ListIdentitiesResponse>(
    "/oauth/identities"
  );
  return response.data;
}
