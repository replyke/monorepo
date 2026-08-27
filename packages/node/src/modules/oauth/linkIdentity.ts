import { SublayHttpClient } from "../../core/client";
import { OAuthIdentity } from "../../interfaces/OAuthIdentity";

export interface LinkIdentityProps {
  provider: string;
  token: string;
}

export async function linkIdentity(
  client: SublayHttpClient,
  data: LinkIdentityProps
): Promise<OAuthIdentity> {
  const response = await client.projectInstance.post<OAuthIdentity>(
    "/oauth/link",
    data
  );
  return response.data;
}
