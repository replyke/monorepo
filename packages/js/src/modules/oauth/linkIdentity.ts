import { SublayHttpClient } from "../../core/client";
import { AuthorizeResponse, OAuthProvider } from "./authorize";

export interface LinkIdentityProps {
  provider: OAuthProvider;
  /** Allowed redirect URI to return the browser to after linking completes. */
  redirectAfterAuth: string;
}

/**
 * Link a new OAuth provider to the **current** user (authenticated). Same
 * redirect contract as {@link authorize}: returns the `authorizationUrl` for the
 * host to redirect to. The current user is taken from the auth token, never the
 * body.
 */
export async function linkIdentity(
  client: SublayHttpClient,
  data: LinkIdentityProps
): Promise<AuthorizeResponse> {
  const response = await client.projectInstance.post<AuthorizeResponse>(
    "/oauth/link",
    data
  );
  return response.data;
}
