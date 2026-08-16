import { useCallback, useState } from "react";
import {
  useProject,
  useSublayDispatch,
  useSublaySelector,
  selectAccessToken,
  requestOAuthAuthorizationUrl,
  handleOAuthRedirect,
} from "@sublay/core";

export interface UseOAuthSignInReturn {
  /** Initiate OAuth sign-in / sign-up (unauthenticated). */
  initiateOAuth: ({ provider, redirectAfterAuth }: { provider: string; redirectAfterAuth?: string }) => Promise<void>;
  /** Link a new OAuth provider to the current authenticated user. */
  linkOAuthProvider: ({ provider, redirectAfterAuth }: { provider: string; redirectAfterAuth?: string }) => Promise<void>;
  /** Call on the callback page to extract tokens from the URL fragment. */
  handleOAuthCallback: () => boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Web-only hook for OAuth sign-in and identity linking.
 * Uses window.location for redirect-based OAuth flow.
 *
 * Usage (sign-in):
 *   const { initiateOAuth, handleOAuthCallback } = useOAuthSignIn();
 *   await initiateOAuth("google", "https://myapp.com/auth/callback");
 *
 * Usage (link provider to current user):
 *   const { linkOAuthProvider, handleOAuthCallback } = useOAuthSignIn();
 *   await linkOAuthProvider("github", "https://myapp.com/settings");
 *
 * On the callback page (component mount):
 *   useEffect(() => { handleOAuthCallback(); }, []);
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

      // No `!accessToken` check here: on a cold start the token is still null
      // while the bootstrap is in flight, and rejecting on that killed a
      // perfectly valid link attempt. `requestOAuthAuthorizationUrl` waits for
      // the gate and throws the same message if nobody is signed in — the catch
      // below surfaces it identically.

      setIsLoading(true);
      setError(null);

      try {
        const redirect = redirectAfterAuth || window.location.href;

        const authorizationUrl = await requestOAuthAuthorizationUrl({
          projectId,
          endpoint,
          provider,
          redirectAfterAuth: redirect,
          // /authorize is unauthenticated; /link requires the access token.
          accessToken: endpoint === "link" ? accessToken ?? null : null,
        });

        // Redirect browser to provider's authorization page.
        // isLoading intentionally stays true since we're navigating away.
        window.location.href = authorizationUrl;
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    },
    [projectId, accessToken]
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

  const handleOAuthCallback = useCallback((): boolean => {
    // The full href carries both halves: tokens in the fragment
    // (#accessToken=...&refreshToken=...) and errors in the query
    // (?error=...&error_description=...). The core tail parses + dispatches;
    // the hook owns the web-specific error state and URL cleanup.
    const { success, error: redirectError } = handleOAuthRedirect({
      url: window.location.href,
      dispatch,
      projectId,
    });

    if (redirectError) {
      setError(redirectError);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      return false;
    }

    if (success) {
      // Tokens were stored in Redux; the AccountManager (via useAccountSync)
      // will detect them and persist them to localStorage.
      // Clean URL (remove fragment with tokens)
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }

    return false;
  }, [dispatch, projectId]);

  return { initiateOAuth, linkOAuthProvider, handleOAuthCallback, isLoading, error };
}

export default useOAuthSignIn;
