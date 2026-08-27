import { SublayHttpClient } from "../../core/client";

/** Providers the server supports (mirrors the server's `oauthProviderSchema`). */
export type OAuthProvider = "google" | "github" | "apple" | "facebook";

export interface AuthorizeProps {
  provider: OAuthProvider;
  /**
   * Where the server should send the browser back to once auth completes. Must
   * be one of the project's allowed redirect URIs (configured in the dashboard).
   */
  redirectAfterAuth: string;
}

export interface AuthorizeResponse {
  /**
   * The provider's authorization URL. The host app redirects the browser here;
   * the provider then bounces to the server's `/oauth/callback`, which finishes
   * auth and redirects back to `redirectAfterAuth` with the session.
   */
  authorizationUrl: string;
}

/**
 * Begin an OAuth sign-in / sign-up flow (unauthenticated). Returns the
 * `authorizationUrl` for the host to redirect to — it does NOT return tokens;
 * the server's callback establishes the session.
 */
export async function authorize(
  client: SublayHttpClient,
  data: AuthorizeProps
): Promise<AuthorizeResponse> {
  const response = await client.projectInstance.post<AuthorizeResponse>(
    "/oauth/authorize",
    data
  );
  return response.data;
}
