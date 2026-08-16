import { useCallback, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  useProject,
  useSublayDispatch,
  useSublaySelector,
  selectAccessToken,
  requestOAuthAuthorizationUrl,
  parseOAuthRedirectUrl,
  handleOAuthRedirect,
  type OAuthRedirectParams,
} from "@sublay/core";

export interface UseOAuthSignInReturn {
  /** Initiate OAuth sign-in / sign-up (unauthenticated). */
  initiateOAuth: ({ provider, redirectAfterAuth }: { provider: string; redirectAfterAuth?: string }) => Promise<void>;
  /** Link a new OAuth provider to the current authenticated user. */
  linkOAuthProvider: ({ provider, redirectAfterAuth }: { provider: string; redirectAfterAuth?: string }) => Promise<void>;
  /** No-op on mobile (the deep-link result is resolved inline). Always returns false. */
  handleOAuthCallback: () => boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Expo hook for OAuth sign-in and identity linking.
 *
 * Opens the Sublay-brokered provider consent screen in the system browser via
 * `expo-web-browser` and receives the result through a custom-scheme deep link.
 * API-compatible with the web `@sublay/react-js` hook, with two mobile deltas:
 *   - `redirectAfterAuth` is REQUIRED (there is no `window.location` default).
 *   - `handleOAuthCallback` is a no-op shim returning `false` — the redirect is
 *     resolved inline by `openAuthSessionAsync`, not on a separate callback page.
 *
 * Token persistence is automatic: the dispatched tokens are picked up by the
 * `AccountManager` (via `useAccountSync`) and written to SecureStore.
 *
 * Usage (sign-in):
 *   const { initiateOAuth } = useOAuthSignIn();
 *   await initiateOAuth({ provider: "google", redirectAfterAuth: "myapp://auth/callback" });
 *
 * Usage (link provider to current user):
 *   const { linkOAuthProvider } = useOAuthSignIn();
 *   await linkOAuthProvider({ provider: "github", redirectAfterAuth: "myapp://settings" });
 */
function useOAuthSignIn(): UseOAuthSignInReturn {
  const { projectId } = useProject();
  const dispatch = useSublayDispatch();
  const accessToken = useSublaySelector(selectAccessToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared helper for both /authorize and /link endpoints
  const startOAuthFlow = useCallback(
    async (endpoint: "authorize" | "link", provider: string, redirectAfterAuth?: string) => {
      if (!projectId) {
        setError("No projectId available.");
        return;
      }

      // Unlike web, there is no window.location to default to — the app must
      // supply the custom-scheme deep link the browser should return to.
      if (!redirectAfterAuth) {
        setError("redirectAfterAuth is required on mobile.");
        return;
      }

      // No `!accessToken` check here: on a cold start the token is still null
      // while the bootstrap is in flight, and rejecting on that killed a
      // perfectly valid link attempt. `requestOAuthAuthorizationUrl` waits for
      // the gate and throws the same message if nobody is signed in — the catch
      // below surfaces it identically.

      setIsLoading(true);
      setError(null);

      try {
        const authorizationUrl = await requestOAuthAuthorizationUrl({
          projectId,
          endpoint,
          provider,
          redirectAfterAuth,
          // /authorize is unauthenticated; /link requires the access token.
          accessToken: endpoint === "link" ? accessToken ?? null : null,
        });

        // Open the system browser and wait for the deep-link return.
        const result = await WebBrowser.openAuthSessionAsync(
          authorizationUrl,
          redirectAfterAuth
        );

        // Anything other than "success" is a user cancel / dismiss — resolve
        // quietly with no error, just clear the loading state.
        if (result.type !== "success") {
          setIsLoading(false);
          return;
        }

        const params = parseRedirectUrl(result.url);
        const { success, error: redirectError } = handleOAuthRedirect({
          params,
          dispatch,
          projectId,
        });

        if (redirectError) {
          setError(redirectError);
        } else if (!success) {
          setError("OAuth sign-in failed: no tokens were returned.");
        }

        setIsLoading(false);
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    },
    [projectId, accessToken, dispatch]
  );

  const initiateOAuth = useCallback(
    ({ provider, redirectAfterAuth }: { provider: string; redirectAfterAuth?: string }) =>
      startOAuthFlow("authorize", provider, redirectAfterAuth),
    [startOAuthFlow]
  );

  const linkOAuthProvider = useCallback(
    ({ provider, redirectAfterAuth }: { provider: string; redirectAfterAuth?: string }) =>
      startOAuthFlow("link", provider, redirectAfterAuth),
    [startOAuthFlow]
  );

  // The web hook parses the callback page URL here; on mobile the redirect is
  // already resolved inline above, so this is a compatibility no-op.
  const handleOAuthCallback = useCallback((): boolean => false, []);

  return { initiateOAuth, linkOAuthProvider, handleOAuthCallback, isLoading, error };
}

/**
 * Parse the deep-link return URL into OAuth params.
 *
 * Tokens arrive in the URL fragment and errors in the query. `expo-linking`'s
 * `parse` reliably surfaces query params but not the fragment, so we read
 * tokens via the core fragment-aware parser and prefer `expo-linking` for the
 * query-side error fields, falling back to the core parse.
 */
function parseRedirectUrl(url: string): OAuthRedirectParams {
  const coreParsed = parseOAuthRedirectUrl(url);
  const { queryParams } = Linking.parse(url);

  const firstString = (value: string | string[] | undefined | null): string | null => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0] ?? null;
    return null;
  };

  return {
    accessToken: coreParsed.accessToken,
    refreshToken: coreParsed.refreshToken,
    error: firstString(queryParams?.error) ?? coreParsed.error,
    errorDescription:
      firstString(queryParams?.error_description) ?? coreParsed.errorDescription,
  };
}

export default useOAuthSignIn;
